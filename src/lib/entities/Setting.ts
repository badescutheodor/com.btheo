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

  @CreateDateColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}