import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';

import { ScheduleEntry } from './schedule-entry.entity';

// Difficulty / impact are now admin-managed (see the difficulty_levels /
// impact_types tables). `training_types` stores their stable `key` strings;
// these aliases stay for readability but are plain strings — the set is no
// longer fixed.
export type TDifficulty = string;
export type TImpactType = string;

@Entity('training_types')
export class TrainingType {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string | null;

    @Column({
        type: 'varchar',
        length: 20,
    })
    difficulty: TDifficulty;

    @Column({ type: 'text', array: true, default: '{}' })
    impactTypes: TImpactType[];

    @Column({ type: 'text', array: true, default: '{}' })
    equipment: string[];

    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt: Date;

    @OneToMany(() => ScheduleEntry, (entry) => entry.trainingType)
    scheduleEntries: ScheduleEntry[];
}
