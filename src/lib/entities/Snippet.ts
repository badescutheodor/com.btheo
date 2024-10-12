import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, ManyToMany, JoinTable } from "typeorm";
import { IsNotEmpty, IsString, IsBoolean, MaxLength, ArrayNotEmpty, ValidateNested, IsOptional, validate } from "class-validator";
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

  static async validate(snippetData: Partial<Snippet>): Promise<string[]> {
    const snippet = plainToClass(Snippet, snippetData);
    const errors = await validate(snippet);
    return errors.map(error => Object.values(error.constraints || {}).join(', '));
  }
}