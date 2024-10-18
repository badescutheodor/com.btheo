import "reflect-metadata";
import { DataSource, DataSourceOptions } from "typeorm";
import * as Entities from './entities';

const options: DataSourceOptions = {
  type: "sqlite",
  database: "db.sqlite",
  entities: Object.values(Entities),
  synchronize: true,
  logging: false,
};

export const AppDataSource = new DataSource(options);

let initialized = false;

export async function initializeDataSource() {
    if (!initialized) {
        try {
            if (!AppDataSource.isInitialized) { 
                await AppDataSource.initialize();
            } else if (!AppDataSource.isConnected) {
                await AppDataSource.connect();
            }
            initialized = true;
            console.log("Data Source has been initialized!");
        } catch (err) {
            console.error("Error during Data Source initialization", err);
            throw err;
        }
    }
    
    return AppDataSource;
}

export async function getDB() {
    return initializeDataSource();
}