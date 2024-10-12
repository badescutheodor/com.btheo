import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, ManyToMany, JoinTable, OneToMany, CreateDateColumn } from "typeorm";
import { IsNotEmpty, IsString, IsDate, IsInt, Min, IsBoolean, IsUrl, IsOptional, ValidateNested, ArrayMinSize, validate } from "class-validator";
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

  static async validate(blogPostData: Partial<BlogPost>): Promise<string[]> {
    const blogPost = plainToClass(BlogPost, blogPostData);
    const errors = await validate(blogPost);
    return errors.map((error: any) => Object.values(error.constraints || {}).join(', '));
  }
}