import { Column, CreateDateColumn, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * Shared columns for the admin-managed taxonomy tables (difficulty levels &
 * impact types). Abstract TypeORM mapped superclass — concrete subclasses add
 * `@Entity(...)` and the table-specific unique index on `key`. `training_types`
 * references rows by the stable `key`, so renaming a label never breaks classes.
 * `color` is a palette token (see `TAXONOMY_COLORS` in @fitcalendar/shared),
 * validated at the API layer to keep this entity dependency-free.
 */
export abstract class TaxonomyEntityBase {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 50 })
    key: string;

    @Column({ type: 'varchar', length: 100 })
    label: string;

    @Column({ type: 'varchar', length: 20 })
    color: string;

    @Column({ type: 'int', default: 0 })
    sortOrder: number;

    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt: Date;
}
