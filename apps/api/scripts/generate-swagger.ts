import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import Yaml from 'yaml';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { ApiModule } from '../src/api.module';
import { createSwaggerConfig } from '../src/config';

const args = yargs(hideBin(process.argv)).option('output', {
    alias: 'o',
    describe: 'output file path',
    demandOption: true,
    type: 'string',
}).argv;

async function generateOpenApi() {
    // Инициализируем приложение
    const app = await NestFactory.create(ApiModule);

    // Получение общей конфигурации для Swagger
    const config = createSwaggerConfig();

    // Генерация документации Swagger
    const document = SwaggerModule.createDocument(app, config);

    // Определение пути вывода
    const { output } = await args;
    const resolvedPath = path.resolve(__dirname, output);
    const basePath = path.dirname(resolvedPath);

    await mkdir(basePath, { recursive: true });

    // Конвертация документации в YAML и запись в файл
    const yamlDoc = Yaml.stringify(document);
    console.log(`Swagger OpenAPI YAML documentation generated at: ${resolvedPath}`);
    await writeFile(resolvedPath, yamlDoc, 'utf8');

    await app.close();
}

// Запуск генерации документации
generateOpenApi().then(
    () => {
        console.log('Documentation generation completed!');
        // Завершение процесса при успехе
        process.exit(0);
    },
    (error) => {
        console.error('Error generating documentation:', error);
        // Завершение процесса с ошибкой
        process.exit(1);
    },
);
