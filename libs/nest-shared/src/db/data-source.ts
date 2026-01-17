import { join } from 'node:path';
import { DataSource } from 'typeorm';

import { baseDbConfig } from './base-db.config';

/**
 * Перечень Entity классов или путей
 * Entities are now located in libs/db/src/entities
 */
export const entities = ['./libs/db/src/entities/**/*.entity.ts'];

/**
 * Перечень классов миграций или путей к миграциям
 * Migrations are now located in libs/db/src/migrations
 */
const migrations = [join(__dirname, '../../../db/src/migrations/*.ts')];

/**
 * DataSource для подключения к БД для работы с миграциями
 */
export default new DataSource({
    ...baseDbConfig(),
    entities,
    migrations,
});
