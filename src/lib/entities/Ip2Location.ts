import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn, PrimaryColumn } from "typeorm";

@Entity()
export class Ip2Location {
    @PrimaryGeneratedColumn()
    id: number;

    @Index()
    @Column("bigint")
    ipFrom: bigint;

    @Index()
    @Column("bigint")
    ipTo: bigint;

    @Column()
    countryCode: string;

    @Column()
    countryName: string;
}