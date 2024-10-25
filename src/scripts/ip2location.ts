import { QueryRunner } from 'typeorm';
import fs from 'fs';
import axios from 'axios';
import path from 'path';
import { getDB } from '../lib/db';
import { createReadStream } from 'fs';
import unzipper from 'unzipper';
import csvParser from 'csv-parser';

const IP2LOCATION_DOWNLOAD_URL = 'https://www.ip2location.com/download/?token=1JgKcK31nwhbf9SQ4Sh9ggL04HTTDrm4NqLpMl5erspdRsQdjJIxyLDXhQXxCiag&file=DB1LITECSV';

async function downloadFile(url: string, outputPath: string): Promise<void> {
  const writer = fs.createWriteStream(outputPath);
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
  });

  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

async function unzipFile(zipPath: string, extractPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    createReadStream(zipPath)
      .pipe(unzipper.Extract({ path: extractPath }))
      .on('close', resolve)
      .on('error', reject);
  });
}

async function importCSV(csvPath: string, queryRunner: QueryRunner): Promise<void> {
  const batchSize = 1000;
  let batch: any[] = [];
  
  return new Promise((resolve, reject) => {
    createReadStream(csvPath)
      .pipe(csvParser(['ipFrom', 'ipTo', 'countryCode', 'countryName']))
      .on('data', async (row: any) => {
        batch.push({
          ipFrom: BigInt(row.ipFrom),
          ipTo: BigInt(row.ipTo),
          countryCode: row.countryCode,
          countryName: row.countryName
        });

        if (batch.length >= batchSize) {
          try {
            await queryRunner.query(
              `INSERT INTO ip2location (ipFrom, ipTo, countryCode, countryName) 
               VALUES ${batch.map(() => '(?, ?, ?, ?)').join(', ')}`,
              batch.flatMap(item => [
                item.ipFrom.toString(),
                item.ipTo.toString(),
                item.countryCode,
                item.countryName
              ])
            );
            batch = [];
          } catch (error) {
            reject(error);
          }
        }
      })
      .on('end', async () => {
        try {
          if (batch.length > 0) {
            await queryRunner.query(
              `INSERT INTO ip2location_temp (ipFrom, ipTo, countryCode, countryName) 
               VALUES ${batch.map(() => '(?, ?, ?, ?)').join(', ')}`,
              batch.flatMap(item => [
                item.ipFrom.toString(),
                item.ipTo.toString(),
                item.countryCode,
                item.countryName
              ])
            );
          }
          resolve();
        } catch (error) {
          reject(error);
        }
      })
      .on('error', reject);
  });
}

async function updateDatabase(csvPath: string, queryRunner: QueryRunner): Promise<void> {
  // Drop existing temp table if exists
  await queryRunner.query(`DROP TABLE IF EXISTS ip2location_temp`);
  
  // Create temporary table
  await queryRunner.query(`
    CREATE TABLE ip2location_temp (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ipFrom TEXT NOT NULL,
      ipTo TEXT NOT NULL,
      countryCode TEXT NOT NULL,
      countryName TEXT NOT NULL
    )
  `);

  // Import data
  await importCSV(csvPath, queryRunner);

  // Create indices on temp table
  await queryRunner.query(`CREATE INDEX idx_ip_range_temp ON ip2location_temp (ipFrom, ipTo)`);

  // Swap tables
  await queryRunner.query(`DROP TABLE IF EXISTS ip2location`);
  await queryRunner.query(`ALTER TABLE ip2location_temp RENAME TO ip2location`);
}

export async function updateIp2LocationDatabase(): Promise<void> {
  const tempDir = path.join(__dirname, 'temp');
  const zipPath = path.join(tempDir, 'IP2LOCATION-LITE-DB1.IPV4.CSV.ZIP');
  const csvPath = path.join(tempDir, 'IP2LOCATION-LITE-DB1.CSV');

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }

  try {
    console.log('Downloading IP2Location database...');
    await downloadFile(IP2LOCATION_DOWNLOAD_URL, zipPath);

    console.log('Extracting ZIP file...');
    await unzipFile(zipPath, tempDir);

    console.log('Updating SQLite database...');
    const db = await getDB();
    const queryRunner = db.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await updateDatabase(csvPath, queryRunner);
      await queryRunner.commitTransaction();
      console.log('IP2Location database updated successfully.');
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    // Clean up temporary files
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
    if (fs.existsSync(csvPath)) fs.unlinkSync(csvPath);
    if (fs.existsSync(tempDir)) fs.rmdirSync(tempDir);
  } catch (error) {
    console.error('Error updating IP2Location database:', error);
    throw error;
  }
}