import { Entity, PrimaryGeneratedColumn, Column, OneToMany, OneToOne, JoinColumn } from "typeorm";
import { IsNotEmpty, IsString, IsEmail, MinLength, MaxLength, IsOptional, ValidateNested, IsEnum, validate, ValidationError } from "class-validator";
import { Type, plainToClass } from "class-transformer";
import { BlogPost } from "./BlogPost";
import { Snippet } from "./Snippet";
import { Upload } from "./Upload";
import type { Relation } from "typeorm";

enum UserRole {
  ADMIN = "admin",
  USER = "user"
}

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

  @Column({ unique: true })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  @Column()
  password: string;

  @Column()
  @IsNotEmpty()
  @IsEnum(UserRole)
  role: string;

  @Column()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio: string;

  @OneToMany(() => BlogPost, (post) => post.author)
  posts: BlogPost[];

  @OneToMany(() => Snippet, (snippet) => snippet.author)
  snippets: Snippet[];

  @OneToOne(() => Upload, { nullable: true })
  @JoinColumn()
  @IsOptional()
  @Type(() => Upload)
  avatar: Relation<Upload>;

  @OneToMany(() => Upload, upload => upload.user)
  uploads: Relation<Upload>[];
}