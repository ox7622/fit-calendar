import type { DataSourceOptions } from 'typeorm';
import { DataSource } from 'typeorm';

import {
    AdminAuditLog,
    AdminUser,
    ClubInfo,
    Coach,
    Customer,
    DifficultyLevel,
    ImpactType,
    MembershipPlan,
    NotificationOutbox,
    Reminder,
    ScheduleEntry,
    TrainingType,
} from './entities';

export const entities = [
    Customer,
    Coach,
    TrainingType,
    DifficultyLevel,
    ImpactType,
    ScheduleEntry,
    Reminder,
    ClubInfo,
    AdminUser,
    MembershipPlan,
    AdminAuditLog,
    NotificationOutbox,
];

export const dataSourceOptions: DataSourceOptions = {
    type: 'postgres',
    database: process.env['NX_DB_NAME'],
    username: process.env['NX_DB_USER'],
    password: process.env['NX_DB_PASS'],
    host: process.env['NX_DB_HOST'],
    port: Number(process.env['NX_DB_PORT']),
    schema: process.env['NX_DB_SCHEMA'] ?? 'public',
    entities,
    migrations: [__dirname + '/migrations/*{.ts,.js}'],
    synchronize: false,
    logging: process.env['NODE_ENV'] === 'development',
};

export const AppDataSource = new DataSource(dataSourceOptions);
