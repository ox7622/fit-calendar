import { DataSource } from 'typeorm';

import { entities } from '../../data-source';

describe('Migration Integration Tests', () => {
    let dataSource: DataSource;

    beforeAll(async () => {
        dataSource = new DataSource({
            type: 'postgres',
            host: process.env['NX_DB_HOST'] || 'localhost',
            port: Number(process.env['NX_DB_PORT']) || 5432,
            username: process.env['NX_DB_USER'] || 'postgres',
            password: process.env['NX_DB_PASS'] || 'postgres',
            database: process.env['NX_DB_NAME'] || 'fitcalendar',
            schema: 'public',
            entities,
            synchronize: false,
            logging: false,
        });

        await dataSource.initialize();
    });

    afterAll(async () => {
        if (dataSource?.isInitialized) {
            await dataSource.destroy();
        }
    });

    describe('Table Structure Verification', () => {
        it('should have all required tables', async () => {
            const tables = await dataSource.query(`
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_type = 'BASE TABLE'
                ORDER BY table_name
            `);

            const tableNames = tables.map((t: { table_name: string }) => t.table_name);

            expect(tableNames).toContain('users');
            expect(tableNames).toContain('coaches');
            expect(tableNames).toContain('training_types');
            expect(tableNames).toContain('schedule_entries');
            expect(tableNames).toContain('reminders');
            expect(tableNames).toContain('club_info');
            expect(tableNames).toContain('admin_users');
        });
    });

    describe('Index Verification', () => {
        it('should have idx_users_telegram_id index', async () => {
            const indexes = await dataSource.query(`
                SELECT indexname FROM pg_indexes
                WHERE tablename = 'users' AND indexname = 'idx_users_telegram_id'
            `);
            expect(indexes.length).toBe(1);
        });

        it('should have schedule_entries indexes', async () => {
            const indexes = await dataSource.query(`
                SELECT indexname FROM pg_indexes
                WHERE tablename = 'schedule_entries'
                ORDER BY indexname
            `);

            const indexNames = indexes.map((i: { indexname: string }) => i.indexname);

            expect(indexNames).toContain('idx_schedule_coach');
            expect(indexNames).toContain('idx_schedule_start_time');
            expect(indexNames).toContain('idx_schedule_status');
            expect(indexNames).toContain('idx_schedule_type');
        });

        it('should have reminders indexes', async () => {
            const indexes = await dataSource.query(`
                SELECT indexname FROM pg_indexes
                WHERE tablename = 'reminders'
                ORDER BY indexname
            `);

            const indexNames = indexes.map((i: { indexname: string }) => i.indexname);

            expect(indexNames).toContain('idx_reminders_notify_at');
            expect(indexNames).toContain('idx_reminders_user');
        });
    });

    describe('Column Verification', () => {
        it('should have correct users table columns', async () => {
            const columns = await dataSource.query(`
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_name = 'users'
                ORDER BY ordinal_position
            `);

            const columnMap = new Map(
                columns.map((c: { column_name: string; data_type: string }) => [c.column_name, c.data_type]),
            );

            expect(columnMap.get('id')).toBe('uuid');
            expect(columnMap.get('telegramId')).toBe('bigint');
            expect(columnMap.get('firstName')).toBe('character varying');
            expect(columnMap.get('lastName')).toBe('character varying');
            expect(columnMap.get('username')).toBe('character varying');
            expect(columnMap.get('reminderMinutes')).toBe('integer');
            expect(columnMap.get('createdAt')).toBe('timestamp with time zone');
            expect(columnMap.get('updatedAt')).toBe('timestamp with time zone');
        });

        it('should have correct coaches table columns with array types', async () => {
            const columns = await dataSource.query(`
                SELECT column_name, data_type, udt_name
                FROM information_schema.columns
                WHERE table_name = 'coaches'
                ORDER BY ordinal_position
            `);

            const specializations = columns.find((c: { column_name: string }) => c.column_name === 'specializations');
            const certifications = columns.find((c: { column_name: string }) => c.column_name === 'certifications');

            expect(specializations?.data_type).toBe('ARRAY');
            expect(certifications?.data_type).toBe('ARRAY');
        });

        it('should have JSONB type for club_info workingHours', async () => {
            const columns = await dataSource.query(`
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_name = 'club_info' AND column_name = 'workingHours'
            `);

            expect(columns[0]?.data_type).toBe('jsonb');
        });
    });

    describe('Constraint Verification', () => {
        it('should have unique constraint on users.telegramId', async () => {
            const constraints = await dataSource.query(`
                SELECT constraint_name, constraint_type
                FROM information_schema.table_constraints
                WHERE table_name = 'users' AND constraint_type = 'UNIQUE'
            `);

            expect(constraints.length).toBeGreaterThan(0);
        });

        it('should have unique constraint on admin_users.email', async () => {
            const constraints = await dataSource.query(`
                SELECT constraint_name, constraint_type
                FROM information_schema.table_constraints
                WHERE table_name = 'admin_users' AND constraint_type = 'UNIQUE'
            `);

            expect(constraints.length).toBeGreaterThan(0);
        });

        it('should have unique constraint on reminders (userId, scheduleEntryId)', async () => {
            const constraints = await dataSource.query(`
                SELECT constraint_name, constraint_type
                FROM information_schema.table_constraints
                WHERE table_name = 'reminders' AND constraint_type = 'UNIQUE'
            `);

            expect(constraints.length).toBeGreaterThan(0);
        });
    });

    describe('Foreign Key Verification', () => {
        it('should have foreign keys on schedule_entries', async () => {
            const fks = await dataSource.query(`
                SELECT
                    tc.constraint_name,
                    kcu.column_name,
                    ccu.table_name AS foreign_table_name
                FROM information_schema.table_constraints AS tc
                JOIN information_schema.key_column_usage AS kcu
                    ON tc.constraint_name = kcu.constraint_name
                JOIN information_schema.constraint_column_usage AS ccu
                    ON ccu.constraint_name = tc.constraint_name
                WHERE tc.table_name = 'schedule_entries'
                    AND tc.constraint_type = 'FOREIGN KEY'
            `);

            const foreignTables = fks.map((f: { foreign_table_name: string }) => f.foreign_table_name);

            expect(foreignTables).toContain('coaches');
            expect(foreignTables).toContain('training_types');
        });

        it('should have foreign keys on reminders with CASCADE delete', async () => {
            const fks = await dataSource.query(`
                SELECT
                    tc.constraint_name,
                    rc.delete_rule
                FROM information_schema.table_constraints AS tc
                JOIN information_schema.referential_constraints AS rc
                    ON tc.constraint_name = rc.constraint_name
                WHERE tc.table_name = 'reminders'
                    AND tc.constraint_type = 'FOREIGN KEY'
            `);

            // All foreign keys on reminders should have CASCADE delete
            fks.forEach((fk: { delete_rule: string }) => {
                expect(fk.delete_rule).toBe('CASCADE');
            });
        });
    });

    describe('Default Value Verification', () => {
        it('should have default value for users.reminderMinutes', async () => {
            const columns = await dataSource.query(`
                SELECT column_default
                FROM information_schema.columns
                WHERE table_name = 'users' AND column_name = 'reminderMinutes'
            `);

            expect(columns[0]?.column_default).toContain('30');
        });

        it('should have default value for coaches.isActive', async () => {
            const columns = await dataSource.query(`
                SELECT column_default
                FROM information_schema.columns
                WHERE table_name = 'coaches' AND column_name = 'isActive'
            `);

            expect(columns[0]?.column_default).toBe('true');
        });

        it('should have default status for schedule_entries', async () => {
            const columns = await dataSource.query(`
                SELECT column_default
                FROM information_schema.columns
                WHERE table_name = 'schedule_entries' AND column_name = 'status'
            `);

            expect(columns[0]?.column_default).toContain('scheduled');
        });
    });
});
