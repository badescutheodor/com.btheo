import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity()
export class Ip2Location {
    @PrimaryGeneratedColumn()
    id: number;

    @Column("text")
    ipFrom: string;

    @Column("text")
    ipTo: string;

    @Column()
    countryCode: string;

    @Column()
    countryName: string;
}