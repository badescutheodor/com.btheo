import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from "typeorm";
import { IsNotEmpty, IsString, MaxLength, Matches, validate, ValidationError  } from "class-validator";
import { plainToClass } from "class-transformer";
import { BlogPost } from "./BlogPost";
import { Snippet } from "./Snippet";

@Entity()
export class Label {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, {
    message: "Slug must contain only lowercase letters, numbers, and hyphens"
  })
  slug: string;

  @Column({ unique: true })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  name: string;

  @ManyToMany(() => BlogPost, (post) => post.labels)
  posts: BlogPost[];

  @ManyToMany(() => Snippet, (snippet) => snippet.labels)
  snippets: Snippet[];

  static async validate(entryData: Partial<Label>): Promise<{ [key: string]: string[] }> {
    const entry = plainToClass(Label, entryData);
    const errors = await validate(entry);
    
    return errors.reduce((acc, error: ValidationError) => {
      if (error.property && error.constraints) {
        acc[error.property] = Object.values(error.constraints);
      }
      return acc;
    }, {} as { [key: string]: string[] });
} 
}