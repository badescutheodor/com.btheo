import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from "typeorm";
import { IsNotEmpty, IsString, IsDate, ValidateNested, MaxLength } from "class-validator";
import { Type, plainToClass } from "class-transformer";
import { BlogPost } from "./BlogPost";
import type { Relation } from "typeorm";

@Entity()
export class Comment {
    @PrimaryGeneratedColumn()
    id: number;
  
    @Column()
    @IsNotEmpty()
    @IsString()
    @MaxLength(100)
    name: string;
  
    @Column("text")
    @IsNotEmpty()
    @IsString()
    @MaxLength(1000)
    content: string;
  
    @ManyToOne(() => BlogPost, post => post.comments)
    @ValidateNested()
    @Type(() => BlogPost)
    post: Relation<BlogPost>
  
    @CreateDateColumn()
    @IsDate()
    createdAt: Date;

    static async validate(commentData: Partial<Comment>): Promise<string[]> {
        const comment = plainToClass(Comment, commentData);
        const errors = await validate(comment);
        return errors.map(error => Object.values(error.constraints || {}).join(', '));
    }
}