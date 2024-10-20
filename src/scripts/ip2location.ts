import { QueryRunner } from 'typeorm';
import fs from 'fs';
import axios from 'axios';
import path from 'path';
import { getDB } from '../lib/db';
import { createReadStream } from 'fs';
import unzipper from 'unzipper';
import csvParser from 'csv-parser';
import { Ip2Location } from '../lib/entities'; // Ensure this path is correct

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
  const ip2LocationRepo = queryRunner.manager.getRepository(Ip2Location);
  return new Promise((resolve, reject) => {
    const insertPromises: Promise<Ip2Location>[] = [];
    createReadStream(csvPath)
      .pipe(csvParser())
      .on('data', (row: any) => {
        const ip2Location = new Ip2Location();
        ip2Location.ipFrom = BigInt(row.ip_from);
        ip2Location.ipTo = BigInt(row.ip_to);
        ip2Location.countryCode = row.country_code;
        ip2Location.countryName = row.country_name;
        
        insertPromises.push(ip2LocationRepo.save(ip2Location));
      })
      .on('end', () => {
        Promise.all(insertPromises)
          .then(() => resolve())
          .catch(reject);
      })
      .on('error', reject);
  });
}

async function updateDatabase(csvPath: string, queryRunner: QueryRunner): Promise<void> {
  await queryRunner.query(`DROP TABLE IF EXISTS ip2location_temp`);
  await queryRunner.query(`
    CREATE TABLE ip2location_temp (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ipFrom BIGINT,
      ipTo BIGINT,
      countryCode TEXT,
      countryName TEXT
    )
  `);

  await importCSV(csvPath, queryRunner);

  await queryRunner.query(`DROP TABLE IF EXISTS ip2location`);
  await queryRunner.query(`ALTER TABLE ip2location_temp RENAME TO ip2location`);
  await queryRunner.query(`CREATE INDEX idx_ip_range ON ip2location (ipFrom, ipTo)`);
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
  } catch (error) {
    console.error('Error updating IP2Location database:', error);
  } finally {
    // Clean up temporary files
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
    if (fs.existsSync(csvPath)) fs.unlinkSync(csvPath);
    if (fs.existsSync(tempDir)) fs.rmdirSync(tempDir);
  }
}

updateIp2LocationDatabase();