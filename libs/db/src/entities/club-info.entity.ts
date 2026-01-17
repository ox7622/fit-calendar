import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

export interface IWorkingHoursEntry {
    open: string;
    close: string;
}

export type TWorkingHours = Record<string, IWorkingHoursEntry | null>;

@Entity('club_info')
export class ClubInfo {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'text' })
    address: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    phone: string | null;

    @Column({ type: 'jsonb', default: '{}' })
    workingHours: TWorkingHours;

    @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
    latitude: number | null;

    @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
    longitude: number | null;

    @Column({ type: 'varchar', length: 500, nullable: true })
    logoUrl: string | null;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt: Date;
}
