import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";
import { IsNotEmpty, IsString, IsOptional } from "class-validator";

enum AnalyticType {
  PAGE_VIEW = 1,
  CLICK = 2,
  SCROLL = 3,
  FORM_SUBMISSION = 4,
  CUSTOM_EVENT = 5,
  ERROR = 6,
  CONVERSION = 7,
  PAGE_LOAD = 8,
  PAGE_UNLOAD = 9,
  SESSION_START = 10,
  EXTERNAL_LINK_CLICK = 11,
}

@Entity()
export class RawAnalytic {
  public static AnalyticTypes = AnalyticType;

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @IsNotEmpty()
  type: AnalyticType;

  @Column("simple-json", { nullable: true })
  @IsOptional()
  data?: Record<string, unknown>;

  @Column()
  @IsNotEmpty()
  @IsString()
  userAgent: string;

  @Column()
  @IsNotEmpty()
  @IsString()
  ipAddress: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @CreateDateColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}