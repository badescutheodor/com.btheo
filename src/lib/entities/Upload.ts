import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from "typeorm";
import { IsNotEmpty, IsString, IsDate, MaxLength, validate, ValidationError } from "class-validator";
import { Type, plainToClass } from "class-transformer";
import { User } from "./User";
import type { Relation } from "typeorm";

@Entity()
export class Upload {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  filename: string;

  @ManyToOne(() => User, user => user.uploads)
  @Type(() => User)
  user: Relation<User>;

  @Column()
  @IsNotEmpty()
  @IsString()
  @MaxLength(1000)
  path: string;

  @Column()
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  type: string;

  @CreateDateColumn()
  @IsDate()
  createdAt: Date;

  static async validate(entryData: Partial<Upload>): Promise<{ [key: string]: string[] }> {
    const entry = plainToClass(Upload, entryData);
    const errors = await validate(entry);
    
    return errors.reduce((acc, error: ValidationError) => {
      if (error.property && error.constraints) {
        acc[error.property] = Object.values(error.constraints);
      }
      return acc;
    }, {} as { [key: string]: string[] });
} 
}