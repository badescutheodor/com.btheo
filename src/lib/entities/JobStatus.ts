import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class JobStatus {
  @PrimaryColumn()
  type: string;

  @Column({ type: 'timestamp' })
  lastProcessedDate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}