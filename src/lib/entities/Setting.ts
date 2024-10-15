import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { IsNotEmpty, IsString, MaxLength, IsDate, validate, ValidationError } from "class-validator";
import { plainToClass } from "class-transformer";

@Entity()
export class Setting {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  key: string;

  @Column("text")
  @IsNotEmpty()
  @IsString()
  value: string;

  @CreateDateColumn()
  @IsDate()
  createdAt: Date;

  @UpdateDateColumn()
  @IsDate()
  updatedAt: Date;

  static async validate(entryData: Partial<Setting>): Promise<{ [key: string]: string[] }> {
    const entry = plainToClass(Setting, entryData);
    const errors = await validate(entry);
    
    return errors.reduce((acc, error: ValidationError) => {
      if (error.property && error.constraints) {
        acc[error.property] = Object.values(error.constraints);
      }
      return acc;
    }, {} as { [key: string]: string[] });
} 
}