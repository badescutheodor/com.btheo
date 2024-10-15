import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, ManyToMany, JoinTable } from "typeorm";
import { IsNotEmpty, IsString, IsBoolean, MaxLength, ArrayNotEmpty, ValidateNested, IsOptional, validate, ValidationError } from "class-validator";
import { Type, plainToClass } from "class-transformer";
import { User } from "./User";
import { Label } from "./Label";
import type { Relation } from "typeorm";

@Entity()
export class Snippet {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  title: string;

  @Column("text")
  @IsNotEmpty()
  @IsString()
  content: string;

  @Column()
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  language: string;

  @Column({ default: false })
  @IsBoolean()
  isFeatured: boolean;

  @ManyToOne('User', 'snippets')
  @ValidateNested()
  @Type(() => User)
  author: Relation<User>;
  
  @ManyToMany(() => Label, (label) => label.snippets)
  @JoinTable()
  @IsOptional()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => Label)
  labels: Label[];

  static async validate(entryData: Partial<Snippet>): Promise<{ [key: string]: string[] }> {
    const entry = plainToClass(Snippet, entryData);
    const errors = await validate(entry);
    
    return errors.reduce((acc, error: ValidationError) => {
      if (error.property && error.constraints) {
        acc[error.property] = Object.values(error.constraints);
      }
      return acc;
    }, {} as { [key: string]: string[] });
} 
}