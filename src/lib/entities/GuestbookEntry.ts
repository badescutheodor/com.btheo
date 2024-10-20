import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";
import { IsNotEmpty, IsString, IsEmail, IsOptional, IsBoolean, IsDate, MaxLength, IsIP, IsUrl, validate, ValidationError } from "class-validator";

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

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    location: string;

    @Column({ default: false })
    @IsBoolean()
    isApproved: boolean = false;

    @Column({ nullable: true })
    @IsOptional()
    @IsIP()
    ipAddress: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    userAgent: string;

    @Column({ nullable: true })
    @IsOptional()
    @IsUrl()
    @MaxLength(255)
    website: string;

    @CreateDateColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;
}