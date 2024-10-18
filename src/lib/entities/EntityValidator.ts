import { ClassConstructor, plainToClass } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { getDB } from '@/lib/db';

export class EntityValidator {
  static async validate<T extends object>(
    entryData: Partial<T>,
    EntityClass: ClassConstructor<T>
  ): Promise<{ [key: string]: string[] }> {
    const db = await getDB();
    const metadata = db.getMetadata(EntityClass);
    const entityWithDefaults = {};
    for (const column of metadata.columns) {
      if (column.default !== undefined && !(column.propertyName in entryData)) {
        (entityWithDefaults as any)[column.propertyName] = column.default;
      }
    }
    const mergedData = { ...entityWithDefaults, ...entryData };
    const entry: any = plainToClass(EntityClass, mergedData);
    const errors = await validate(entry);
    return errors.reduce((acc, error: ValidationError) => {
      if (error.property && error.constraints) {
        acc[error.property] = Object.values(error.constraints);
      }
      return acc;
    }, {} as { [key: string]: string[] });
  }
}

export default EntityValidator;