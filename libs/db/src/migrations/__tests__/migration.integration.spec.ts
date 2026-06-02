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

            // Story 7.2: `users` renamed to `customers`.
            expect(tableNames).toContain('customers');
            expect(tableNames).not.toContain('users');
            expect(tableNames).toContain('coaches');
            expect(tableNames).toContain('training_types');
            expect(tableNames).toContain('schedule_entries');
            expect(tableNames).toContain('reminders');
            expect(tableNames).toContain('club_info');
            expect(tableNames).toContain('admin_users');
            // Story 7.1: membership plans catalog.
            expect(tableNames).toContain('membership_plans');
        });
    });

    describe('Index Verification', () => {
        it('should have idx_customers_telegram_id index (renamed from idx_users_telegram_id in 7.2)', async () => {
            const indexes = await dataSource.query(`
                SELECT indexname FROM pg_indexes
                WHERE tablename = 'customers' AND indexname = 'idx_customers_telegram_id'
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

        it('should have reminders indexes (idx_reminders_customer renamed in 7.2)', async () => {
            const indexes = await dataSource.query(`
                SELECT indexname FROM pg_indexes
                WHERE tablename = 'reminders'
                ORDER BY indexname
            `);

            const indexNames = indexes.map((i: { indexname: string }) => i.indexname);

            expect(indexNames).toContain('idx_reminders_notify_at');
            expect(indexNames).toContain('idx_reminders_customer');
        });
    });

    describe('Column Verification', () => {
        it('should have correct customers table columns', async () => {
            const columns = await dataSource.query(`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'customers'
                ORDER BY ordinal_position
            `);

            const columnMap = new Map(
                columns.map((c: { column_name: string; data_type: string; is_nullable: string }) => [
                    c.column_name,
                    { type: c.data_type, nullable: c.is_nullable === 'YES' },
                ]),
            );

            // Inherited from the original users table.
            expect(columnMap.get('id')).toEqual({ type: 'uuid', nullable: false });
            expect(columnMap.get('firstName')).toEqual({ type: 'character varying', nullable: false });
            expect(columnMap.get('lastName')).toEqual({ type: 'character varying', nullable: true });
            expect(columnMap.get('reminderMinutes')).toEqual({ type: 'integer', nullable: false });
            expect(columnMap.get('createdAt')).toEqual({ type: 'timestamp with time zone', nullable: false });
            expect(columnMap.get('updatedAt')).toEqual({ type: 'timestamp with time zone', nullable: false });

            // 7.2: telegramId becomes nullable; new admin-managed columns.
            expect(columnMap.get('telegramId')).toEqual({ type: 'bigint', nullable: true });
            expect(columnMap.get('telegramUsername')).toEqual({ type: 'character varying', nullable: true });
            expect(columnMap.get('phone')).toEqual({ type: 'character varying', nullable: false });
            expect(columnMap.get('email')).toEqual({ type: 'character varying', nullable: true });
            expect(columnMap.get('notes')).toEqual({ type: 'text', nullable: true });
            expect(columnMap.get('isActive')).toEqual({ type: 'boolean', nullable: false });

            // Old `username` column was dropped (renamed semantically to telegramUsername).
            expect(columnMap.has('username')).toBe(false);
        });

        it('should have customerId on reminders (renamed from userId in 7.2)', async () => {
            const columns = await dataSource.query(`
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'reminders'
            `);
            const columnNames = columns.map((c: { column_name: string }) => c.column_name);

            expect(columnNames).toContain('customerId');
            expect(columnNames).not.toContain('userId');
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
        it('should have unique constraint on customers.telegramId', async () => {
            const constraints = await dataSource.query(`
                SELECT constraint_name, constraint_type
                FROM information_schema.table_constraints
                WHERE table_name = 'customers' AND constraint_type = 'UNIQUE'
            `);

            // 7.2 keeps the original UQ_df18d17f84763558ac84192c754 unique-on-telegramId
            // AND adds a phone unique constraint, so at least 2.
            expect(constraints.length).toBeGreaterThanOrEqual(2);
        });

        it('should have unique constraint on customers.phone (7.2)', async () => {
            const constraints = await dataSource.query(`
                SELECT
                    tc.constraint_name
                FROM information_schema.table_constraints AS tc
                JOIN information_schema.key_column_usage AS kcu
                    ON tc.constraint_name = kcu.constraint_name
                WHERE tc.table_name = 'customers'
                    AND tc.constraint_type = 'UNIQUE'
                    AND kcu.column_name = 'phone'
            `);
            expect(constraints.length).toBe(1);
        });

        it('should have unique constraint on admin_users.email', async () => {
            const constraints = await dataSource.query(`
                SELECT constraint_name, constraint_type
                FROM information_schema.table_constraints
                WHERE table_name = 'admin_users' AND constraint_type = 'UNIQUE'
            `);

            expect(constraints.length).toBeGreaterThan(0);
        });

        it('should have unique constraint on reminders (customerId, scheduleEntryId)', async () => {
            // The 7.2 migration kept the original constraint name (column-rename only
            // — Postgres tracks columns by attnum). The semantic check still applies.
            const constraints = await dataSource.query(`
                SELECT
                    tc.constraint_name,
                    array_agg(kcu.column_name ORDER BY kcu.ordinal_position) AS columns
                FROM information_schema.table_constraints AS tc
                JOIN information_schema.key_column_usage AS kcu
                    ON tc.constraint_name = kcu.constraint_name
                WHERE tc.table_name = 'reminders'
                    AND tc.constraint_type = 'UNIQUE'
                GROUP BY tc.constraint_name
            `);

            expect(constraints.length).toBeGreaterThan(0);
            const composite = constraints.find(
                (c: { columns: string[] }) => c.columns.includes('customerId') && c.columns.includes('scheduleEntryId'),
            );
            expect(composite).toBeDefined();
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

        it('should have reminders.customerId → customers.id FK (renamed in 7.2)', async () => {
            const fks = await dataSource.query(`
                SELECT
                    kcu.column_name,
                    ccu.table_name AS foreign_table_name,
                    ccu.column_name AS foreign_column_name
                FROM information_schema.table_constraints AS tc
                JOIN information_schema.key_column_usage AS kcu
                    ON tc.constraint_name = kcu.constraint_name
                JOIN information_schema.constraint_column_usage AS ccu
                    ON ccu.constraint_name = tc.constraint_name
                WHERE tc.table_name = 'reminders'
                    AND tc.constraint_type = 'FOREIGN KEY'
                    AND kcu.column_name = 'customerId'
            `);
            expect(fks.length).toBe(1);
            expect(fks[0].foreign_table_name).toBe('customers');
            expect(fks[0].foreign_column_name).toBe('id');
        });
    });

    describe('Default Value Verification', () => {
        it('should have default value for customers.reminderMinutes', async () => {
            const columns = await dataSource.query(`
                SELECT column_default
                FROM information_schema.columns
                WHERE table_name = 'customers' AND column_name = 'reminderMinutes'
            `);

            expect(columns[0]?.column_default).toContain('30');
        });

        it('should have default value for customers.isActive (7.2)', async () => {
            const columns = await dataSource.query(`
                SELECT column_default
                FROM information_schema.columns
                WHERE table_name = 'customers' AND column_name = 'isActive'
            `);

            expect(columns[0]?.column_default).toBe('true');
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
