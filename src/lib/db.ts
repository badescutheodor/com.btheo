import "reflect-metadata";
import { DataSource, DataSourceOptions } from "typeorm";
import * as Entities from './entities';
import path from 'path';

const isDevelopment = process.env.NODE_ENV === 'development';

const options: DataSourceOptions = {
  type: "sqlite",
  database: path.join(process.cwd(), 'db.sqlite'),
  entities: Object.values(Entities),
  synchronize: isDevelopment,
  logging: isDevelopment,
};

class DatabaseConnectionManager {
  private static instance: DatabaseConnectionManager;
  private connection: DataSource | null = null;

  private constructor() {}

  public static getInstance(): DatabaseConnectionManager {
    if (!DatabaseConnectionManager.instance) {
      DatabaseConnectionManager.instance = new DatabaseConnectionManager();
    }
    return DatabaseConnectionManager.instance;
  }

  public async getConnection(): Promise<DataSource> {
    if (!this.connection) {
      this.connection = new DataSource(options);
    }

    if (!this.connection.isInitialized) {
      await this.connection.initialize();
      console.log("Data Source has been initialized!");
    }

    return this.connection;
  }

  public async closeConnection(): Promise<void> {
    if (this.connection && this.connection.isInitialized) {
      await this.connection.destroy();
      this.connection = null;
      console.log("Data Source has been closed.");
    }
  }
}

export const getDB = async (): Promise<DataSource> => {
  const manager = DatabaseConnectionManager.getInstance();
  return manager.getConnection();
};

export const closeDB = async (): Promise<void> => {
  const manager = DatabaseConnectionManager.getInstance();
  return manager.closeConnection();
};