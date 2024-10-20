import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { IsNotEmpty } from "class-validator";

@Entity()
export class Analytic {
  @PrimaryGeneratedColumn()
  id: number;

  @IsNotEmpty()
  type: string;

  @Column("simple-json", { nullable: true })
  data: Record<string, unknown>;

  @CreateDateColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}