import "reflect-metadata";
import { DataSource, DataSourceOptions } from "typeorm";
import * as Entities from './entities';

const options: DataSourceOptions = {
  type: "sqlite",
  database: "db.sqlite",
  entities: Entities,
  synchronize: true,
  logging: false,
};

export const AppDataSource = new DataSource(options);

export async function initializeDataSource() {
    if (!AppDataSource.isConnected) {
        await AppDataSource.connect();
    }

    return AppDataSource;
}

export async function getDB() {
  await initializeDataSource();

  return AppDataSource;
}