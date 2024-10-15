import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, ManyToMany, JoinTable, OneToMany, CreateDateColumn } from "typeorm";
import { IsNotEmpty, IsString, IsDate, IsInt, Min, IsBoolean, IsUrl, IsOptional, ValidateNested, ArrayMinSize, validate, ValidationError } from "class-validator";
import { Type, plainToClass } from "class-transformer";
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

  @Column({ default: false })
  @IsBoolean()
  isFeatured: boolean;

  @ManyToOne(() => User, (user) => user.posts)
  author: Relation<User>;

  @ManyToMany(() => Label, (label) => label.posts) 
  @JoinTable()
  @ArrayMinSize(1)
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

  static async validate(entryData: Partial<BlogPost>): Promise<{ [key: string]: string[] }> {
    const entry = plainToClass(BlogPost, entryData);
    const errors = await validate(entry);
    
    return errors.reduce((acc, error: ValidationError) => {
      if (error.property && error.constraints) {
        acc[error.property] = Object.values(error.constraints);
      }
      return acc;
    }, {} as { [key: string]: string[] });
} 
}