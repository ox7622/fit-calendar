import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';

import { ScheduleEntry } from './schedule-entry.entity';

@Entity('coaches')
export class Coach {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'text', nullable: true })
    bio: string | null;

    @Column({ type: 'varchar', length: 500, nullable: true })
    photoUrl: string | null;

    @Column({ type: 'text', array: true, default: '{}' })
    specializations: string[];

    @Column({ type: 'text', array: true, default: '{}' })
    certifications: string[];

    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt: Date;

    @OneToMany(() => ScheduleEntry, (entry) => entry.coach)
    scheduleEntries: ScheduleEntry[];
}
