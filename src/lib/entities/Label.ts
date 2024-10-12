import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from "typeorm";
import { IsNotEmpty, IsString, MaxLength, Matches, validate } from "class-validator";
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

  static async validate(labelData: Partial<Label>): Promise<string[]> {
    const label = plainToClass(Label, labelData);
    const errors = await validate(label);
    return errors.map(error => Object.values(error.constraints || {}).join(', '));
  }
}