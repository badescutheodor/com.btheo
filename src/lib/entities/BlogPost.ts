import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, ManyToMany, JoinTable, OneToMany, CreateDateColumn, getRepository } from "typeorm";
import { IsNotEmpty, IsString, IsDate, IsInt, Min, IsBoolean, IsUrl, IsOptional, ValidateNested, IsEnum, ArrayMinSize, validate, ValidationError } from "class-validator";
import { Type, plainToClass, ClassConstructor } from "class-transformer";
import type { Relation } from "typeorm";
import { User } from "./User";
import { Label } from "./Label";
import { Comment } from "./Comment";

class MetaTags {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString({ each: true })
  keywords?: string[];

  @IsOptional()
  @IsUrl()
  ogImage?: string;

  @IsOptional()
  @IsString()
  ogTitle?: string;

  @IsOptional()
  @IsString()
  ogDescription?: string;
}

enum BlogPostStatus {
  DRAFT = "draft",
  PUBLISHED = "published",
}

@Entity()
export class BlogPost {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @IsNotEmpty()
  @IsString()
  title: string;

  @Column("text")
  @IsNotEmpty()
  @IsString()
  content: string;

  @Column("text")
  @IsNotEmpty()
  @IsString()
  excerpt: string;

  @Column({
    type: "varchar",
    length: 20,
    default: BlogPostStatus.DRAFT
  })
  @IsEnum(BlogPostStatus, { message: "Invalid post status" })
  status: 'draft' | 'published';

  @Column()
  @IsDate()
  date: Date;

  @Column()
  @IsString()
  readTime: string;

  @Column({ default: 0 })
  @IsInt()
  @Min(0)
  views: number;

  @Column({ default: 0 })
  @IsInt()
  @Min(0)
  claps: number;

  @Column({ default: false })
  @IsBoolean()
  isFeatured: boolean;

  @ManyToOne(() => User, (user) => user.posts)
  author: Relation<User>;

  @ManyToMany(() => Label, (label) => label.posts) 
  @JoinTable()
  @ArrayMinSize(0)
  labels: Label[];

  @Column()
  @IsNotEmpty()
  @IsString()
  slug: string;

  @OneToMany(() => Comment, comment => comment.post)
  comments: Comment[];

  @CreateDateColumn()
  createdAt: Date;

  @Column("simple-json", { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => MetaTags)
  metaTags: MetaTags;
}