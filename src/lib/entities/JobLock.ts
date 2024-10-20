import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity()
export class JobLock {
  @PrimaryColumn()
  jobType: string;

  @Column({ type: 'datetime' })
  lockedUntil: Date;
}