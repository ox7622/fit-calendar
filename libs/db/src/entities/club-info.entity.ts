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

    @Column({ type: 'varchar', length: 500, nullable: true })
    mapUrl: string | null;

    @Column({ type: 'varchar', length: 500, nullable: true })
    logoUrl: string | null;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt: Date;
}
