import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";
import { IsNotEmpty, IsString, IsEmail, IsOptional, IsBoolean, IsDate, MaxLength, IsIP, IsUrl, validate, ValidationError } from "class-validator";
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

    static async validate(entryData: Partial<GuestbookEntry>): Promise<{ [key: string]: string[] }> {
        const entry = plainToClass(GuestbookEntry, entryData);
        const errors = await validate(entry);
        
        return errors.reduce((acc, error: ValidationError) => {
          if (error.property && error.constraints) {
            acc[error.property] = Object.values(error.constraints);
          }
          return acc;
        }, {} as { [key: string]: string[] });
      }
}