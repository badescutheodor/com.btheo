import { cookies } from 'next/headers';
import { getDB } from '@/lib/db';
import { Setting } from '@/lib/entities/Setting';
import { cache } from 'react';
import { revalidatePath } from 'next/cache';
import { Repository, FindOptionsWhere, FindOptionsOrder, FindOperator, FindOptionsSelect, FindOptionsRelations, ILike, Between, In, Not, LessThan, LessThanOrEqual, MoreThan, MoreThanOrEqual, Like, IsNull } from 'typeorm';

export async function getCurrentUser() {
  const token = cookies().get('token')?.value;

  if (!token) {
    return null;
  }

  try {
    const response = await fetch(`${process.env.API_URL}/api/user`, {
      headers: {
        'Cookie': `token=${token}`
      },
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch user:', error);
    return null;
  }
}

export interface SettingsData {
  [key: string]: any;
}

let cachedSettings: SettingsData | null = null;

async function fetchSettings(): Promise<SettingsData> {
  const db = await getDB();
  const settingRepository = db.getRepository(Setting);
  const settings = await settingRepository.find();
  
  const settingsObject = settings.reduce<SettingsData>((acc, setting) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {});

  cachedSettings = settingsObject;
  return settingsObject;
}

const getCachedSettings = cache(async (): Promise<SettingsData> => {
  if (cachedSettings) {
    return cachedSettings;
  }
  return fetchSettings();
});

export async function getSettings(): Promise<SettingsData> {
  return getCachedSettings();
}

export async function refetchSettings() {
  'use server';
  cachedSettings = null; // Invalidate cache
  await fetchSettings();
  revalidatePath('/'); // Revalidate all pages that use this data
}

type ObjectLiteral = Record<string, any>;

type DeepPartial<T> = T extends ObjectLiteral ? {
  [P in keyof T]?: T[P] extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T[P] extends ObjectLiteral
    ? DeepPartial<T[P]>
    : T[P];
} : T;

type SortOption<T> = {
  field: keyof T;
  order: 'ASC' | 'DESC';
};

type Primitive = string | number | boolean | null | undefined;

type SafeDotNotation<T, Depth extends number[] = []> = T extends Primitive
  ? never
  : T extends Array<infer U>
  ? `${number}` | `${number}.${SafeDotNotation<U, [...Depth, 0]>}`
  : {
      [K in keyof T]: K extends string
        ? Depth['length'] extends 5
          ? never
          : T[K] extends Primitive
          ? K
          : `${K}` | `${K}.${SafeDotNotation<T[K], [...Depth, 0]>}`
        : never;
    }[keyof T];

type TypeORMFilter<T> = {
  [P in keyof T]?: T[P] extends Array<infer U>
    ? TypeORMFilter<U>[]
    : T[P] extends ObjectLiteral
    ? TypeORMFilter<T[P]>
    : T[P] | FindOperator<T[P]>;
};

interface FilterOperators {
  $eq?: any;
  $ne?: any;
  $gt?: number | Date;
  $gte?: number | Date;
  $lt?: number | Date;
  $lte?: number | Date;
  $between?: [number, number] | [Date, Date];
  $in?: any[];
  $nin?: any[];
  $like?: string;
  $ilike?: string;
  $null?: boolean;
}

interface QueryOptions<T extends ObjectLiteral> {
  page?: number;
  limit?: number;
  sort?: string;
  search?: string;
  searchFields?: (keyof T)[];
  filters?: DeepPartial<T & { [key: string]: FilterOperators }>;
}

export class QueryHandler<T extends ObjectLiteral> {
  private roleFields: Record<string, SafeDotNotation<T>[]> = {};

  constructor(private repository: Repository<T>) {}

  setRoleFields(role: string, fields: SafeDotNotation<T>[]) {
    this.roleFields[role] = fields;
  }

 async filterMulti(options: QueryOptions<T>, relations: FindOptionsRelations<T> = {}, role?: string) {
    const where = this.buildWhereClause(options);
    const order = this.buildOrderClause(options.sort);
    const select = this.buildSelectClause(role);
    
    const [items, total] = await this.repository.findAndCount({
      where,
      relations,
      order,
      skip: ((options.page || 1) - 1) * (options.limit || 10),
      take: options.limit || 10,
      select,
    });

    return {
      data: items,
      meta: {
        currentPage: options.page || 1,
        totalPages: Math.ceil(total / (options.limit || 10)),
        totalItems: total,
        itemsPerPage: options.limit || 10,
      },
    };
  }

  async filterOne(options: QueryOptions<T>, relations: FindOptionsRelations<T> = {}, role?: string): Promise<T | null> {
    const where = this.buildWhereClause(options);
    const order = this.buildOrderClause(options.sort);
    const select = this.buildSelectClause(role);

    const entity = await this.repository.findOne({
      where,
      relations,
      order,
      select,
    });

    return entity;
  }

  private buildWhereClause(options: QueryOptions<T>): FindOptionsWhere<T> {
    const where: FindOptionsWhere<T> = {};

    if (options.filters) {
      Object.assign(where, this.parseFilters(options.filters));
    }

    if (options.search && options.searchFields) {
      const searchConditions: FindOptionsWhere<T>[] = options.searchFields.map(field => ({
        [field]: ILike(`%${options.search}%`)
      } as FindOptionsWhere<T>));

      if (searchConditions.length > 0) {
        Object.assign(where, searchConditions.length === 1 ? searchConditions[0] : { $or: searchConditions });
      }
    }

    return where;
  }

  private parseFilters(filters: DeepPartial<T & { [key: string]: FilterOperators }>): TypeORMFilter<T> {
    const parsedFilters: TypeORMFilter<T> = {};
    for (const [key, value] of Object.entries(filters)) {
      if (this.isFilterOperators(value)) {
        parsedFilters[key as keyof T] = this.parseFilterOperators(value) as any;
      } else if (Array.isArray(value)) {
        parsedFilters[key as keyof T] = value.map(item => 
          this.isFilterOperators(item) ? this.parseFilterOperators(item) : this.parseFilterValue(item)
        ) as any;
      } else if (typeof value === 'object' && value !== null) {
        parsedFilters[key as keyof T] = this.parseFilters(value as DeepPartial<T & { [key: string]: FilterOperators }>) as any;
      } else {
        parsedFilters[key as keyof T] = value as any;
      }
    }
    return parsedFilters;
  }

  private isFilterOperators(value): value is FilterOperators {
    if (typeof value !== 'object' || value === null) return false;
    const operatorKeys = ['$eq', '$ne', '$gt', '$gte', '$lt', '$lte', '$between', '$in', '$nin', '$like', '$ilike', '$null'];
    return operatorKeys.some(key => key in value);
  }

  private parseFilterOperators(operators: FilterOperators): FindOperator<T[keyof T]> {
    if ('$eq' in operators) return operators.$eq;
    if ('$ne' in operators) return Not(operators.$ne);
    if ('$gt' in operators) return MoreThan(operators.$gt);
    if ('$gte' in operators) return MoreThanOrEqual(operators.$gte);
    if ('$lt' in operators) return LessThan(operators.$lt);
    if ('$lte' in operators) return LessThanOrEqual(operators.$lte);
    if ('$between' in operators) return Between(operators.$between[0], operators.$between[1]);
    if ('$in' in operators) return In(operators.$in);
    if ('$nin' in operators) return Not(In(operators.$nin));
    if ('$like' in operators) return Like(`%${operators.$like}%`);
    if ('$ilike' in operators) return ILike(`%${operators.$ilike}%`);
    if ('$null' in operators) return operators.$null ? IsNull() : Not(IsNull());
    return operators;
  }

  private parseFilterValue(value: any): any {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return this.parseFilters(value);
    }
    return value;
  }

  private buildOrderClause(sortParam?: string): FindOptionsOrder<T> | undefined {
    if (!sortParam) return undefined;

    const sortOptions = this.parseSortParams(sortParam);
    if (!sortOptions || sortOptions.length === 0) return undefined;

    return sortOptions.reduce((orderBy, { field, order }) => {
      orderBy[field] = order as any;
      return orderBy;
    }, {} as FindOptionsOrder<T>);
  }

  private buildSelectClause(role?: string): FindOptionsSelect<T> | undefined {
    if (role && this.roleFields[role]) {
      return this.convertDotNotationToSelect(this.roleFields[role]);
    }
    return undefined;
  }

  private convertDotNotationToSelect(fields: SafeDotNotation<T>[]): FindOptionsSelect<T> {
    const select: FindOptionsSelect<T> = {};
    fields.forEach(field => {
      const parts = (field as string).split('.');
      let current: any = select;
      parts.forEach((part, index) => {
        if (index === parts.length - 1) {
          current[part] = true;
        } else {
          current[part] = current[part] || {};
          current = current[part];
        }
      });
    });
    return select;
  }

  private parseSortParams(sortParam: string): SortOption<T>[] {
    return sortParam.split(',').map(part => {
      const [field, order] = part.split(':');
      return {
        field: field as keyof T,
        order: (order?.toUpperCase() as 'ASC' | 'DESC') || 'ASC'
      };
    }).filter(this.isValidSortOption);
  }

  private isValidSortOption(option: any): option is SortOption<T> {
    return typeof option === 'object' && 
           'field' in option && 
           'order' in option &&
           (option.order === 'ASC' || option.order === 'DESC');
  }
}