/**
 * Создаёт миграцию вызовом typeorm:create с указанным в строке вызова именем
 */
import { exec } from 'node:child_process';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { entities } from './data-source';

const pexec = promisify(exec);

const dataSourcePath = join(__dirname, 'data-source.ts');
const migrationsDir = join(__dirname, '../../../db/src/migrations');

const makeCommand = (name: string) => `npm run typeorm migration:generate -- -d "${dataSourcePath}" "${name}"`;

(async () => {
    if (!entities.length) {
        throw new Error(`Не указаны "entity" в конфиге dataSource, генерация невозможна`);
    }
    const name = process.argv[2];
    if (!name) {
        throw new Error(`Не указано имя новой миграции в строке вызова`);
    }
    if (!/^[A-Z][a-zA-Z0-9]+$/.test(name)) {
        throw new Error(
            `Имя миграции должно быть в pascal-case и содержать только английские буквы` +
                ` или цифры, например: "CreateTableUsers"`,
        );
    }
    const fullName = join(migrationsDir, name);
    const { stdout } = await pexec(makeCommand(fullName));
    console.log(stdout);
    console.log(`\nСоздание миграции прошло успешно\n`);
})().catch((e: any) => {
    console.log(`Ошибка при создании новой миграции`);
    if (e.stdout) {
        console.error(e.stdout);
    }
    console.error(e.message);
    process.exit(1);
});
