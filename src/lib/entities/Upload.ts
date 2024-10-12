import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from "typeorm";
import { IsNotEmpty, IsString, IsDate, MaxLength, ValidateNested, validate } from "class-validator";
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
  @ValidateNested()
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

  static async validate(uploadData: Partial<Upload>): Promise<string[]> {
    const upload = plainToClass(Upload, uploadData);
    const errors = await validate(upload);
    return errors.map(error => Object.values(error.constraints || {}).join(', '));
  }
}