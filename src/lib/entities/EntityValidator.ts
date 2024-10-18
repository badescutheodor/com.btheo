import { ClassConstructor, plainToClass } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { getDB } from '@/lib/db';

export class EntityValidator {
  static async validate<T extends object>(
    entryData: Partial<T>,
    EntityClass: ClassConstructor<T>
  ): Promise<{ [key: string]: string[] }> {
    const db = await getDB();
    const repository = db.getRepository(EntityClass);
    const entityWithDefaults = repository.create() as T;
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