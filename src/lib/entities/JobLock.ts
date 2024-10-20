import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity()
export class JobLock {
  @PrimaryColumn()
  jobType: string;

  @Column({ type: 'timestamp' })
  lockedUntil: Date;
}