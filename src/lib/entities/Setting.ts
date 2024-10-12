import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { IsNotEmpty, IsString, MaxLength, IsDate, validate } from "class-validator";
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

  static async validate(settingData: Partial<Setting>): Promise<string[]> {
    const setting = plainToClass(Setting, settingData);
    const errors = await validate(setting);
    return errors.map(error => Object.values(error.constraints || {}).join(', '));
  }
}