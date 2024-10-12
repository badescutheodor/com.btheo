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

let initialized = false;

export async function initializeDataSource() {
    if (!initialized) {
        await AppDataSource.initialize();
        initialized = true;
    }

    return AppDataSource;
}

export async function getDB() {
  if (!AppDataSource.isInitialized) {
      await initializeDataSource();
  }

  return AppDataSource;
}