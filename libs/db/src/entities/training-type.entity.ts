import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';

import { ScheduleEntry } from './schedule-entry.entity';

export type TDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type TImpactType = 'cardio' | 'strength' | 'flexibility' | 'balance';

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
