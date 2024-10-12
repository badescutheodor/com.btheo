import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";
import { IsNotEmpty, IsString, IsEmail, IsOptional, IsBoolean, IsDate, MaxLength, IsIP, validate } from "class-validator";
import { plainToClass } from "class-transformer";

@Entity()
export class GuestbookEntry {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    @IsNotEmpty()
    @IsString()
    @MaxLength(100)
    name: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsEmail()
    email: string;

    @Column("text")
    @IsNotEmpty()
    @IsString()
    @MaxLength(1000)
    message: string;

    @CreateDateColumn()
    @IsDate()
    createdAt: Date;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    location: string;

    @Column({ default: false })
    @IsBoolean()
    isApproved: boolean;

    @Column({ nullable: true })
    @IsOptional()
    @IsIP()
    ipAddress: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    userAgent: string;

    static async validate(entryData: Partial<GuestbookEntry>): Promise<string[]> {
        const entry = plainToClass(GuestbookEntry, entryData);
        const errors = await validate(entry);
        return errors.map(error => Object.values(error.constraints || {}).join(', '));
    }
}