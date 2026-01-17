import * as fs from 'fs';
import * as path from 'path';

/**
 * Project Structure Verification Tests for Story 1.1
 * These tests verify the Nx monorepo is correctly configured
 */

const ROOT_DIR = path.resolve(__dirname, '../../../..');

describe('Story 1.1: Project Scaffolding Verification', () => {
    describe('Apps Structure (AC: 1)', () => {
        const appsDir = path.join(ROOT_DIR, 'apps');

        it('should have apps directory', () => {
            expect(fs.existsSync(appsDir)).toBe(true);
        });

        it('should have api app', () => {
            const apiDir = path.join(appsDir, 'api');
            expect(fs.existsSync(apiDir)).toBe(true);
            expect(fs.existsSync(path.join(apiDir, 'project.json'))).toBe(true);
        });

        it('should have bot app', () => {
            const botDir = path.join(appsDir, 'bot');
            expect(fs.existsSync(botDir)).toBe(true);
            expect(fs.existsSync(path.join(botDir, 'project.json'))).toBe(true);
        });

        it('should have mini-app app', () => {
            const miniAppDir = path.join(appsDir, 'mini-app');
            expect(fs.existsSync(miniAppDir)).toBe(true);
            expect(fs.existsSync(path.join(miniAppDir, 'project.json'))).toBe(true);
        });

        it('should have admin app', () => {
            const adminDir = path.join(appsDir, 'admin');
            expect(fs.existsSync(adminDir)).toBe(true);
            expect(fs.existsSync(path.join(adminDir, 'project.json'))).toBe(true);
        });
    });

    describe('Libs Structure (AC: 2)', () => {
        const libsDir = path.join(ROOT_DIR, 'libs');

        it('should have libs directory', () => {
            expect(fs.existsSync(libsDir)).toBe(true);
        });

        it('should have shared lib', () => {
            const sharedDir = path.join(libsDir, 'shared');
            expect(fs.existsSync(sharedDir)).toBe(true);
            expect(fs.existsSync(path.join(sharedDir, 'project.json'))).toBe(true);
        });

        it('should have db lib', () => {
            const dbDir = path.join(libsDir, 'db');
            expect(fs.existsSync(dbDir)).toBe(true);
            expect(fs.existsSync(path.join(dbDir, 'project.json'))).toBe(true);
        });

        it('should have ui lib', () => {
            const uiDir = path.join(libsDir, 'ui');
            expect(fs.existsSync(uiDir)).toBe(true);
            expect(fs.existsSync(path.join(uiDir, 'project.json'))).toBe(true);
        });
    });

    describe('TypeScript Configuration (AC: 3)', () => {
        it('should have tsconfig.base.json', () => {
            const tsconfigPath = path.join(ROOT_DIR, 'tsconfig.base.json');
            expect(fs.existsSync(tsconfigPath)).toBe(true);
        });

        it('should have strict mode enabled in tsconfig.base.json', () => {
            const tsconfigPath = path.join(ROOT_DIR, 'tsconfig.base.json');
            const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));

            expect(tsconfig.compilerOptions?.strict).toBe(true);
        });

        it('should have strictNullChecks enabled', () => {
            const tsconfigPath = path.join(ROOT_DIR, 'tsconfig.base.json');
            const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));

            // strictNullChecks is included in strict: true
            expect(tsconfig.compilerOptions?.strict).toBe(true);
        });
    });

    describe('ESLint Configuration (AC: 4)', () => {
        it('should have eslint config file', () => {
            const eslintPath = path.join(ROOT_DIR, 'eslint.config.mjs');
            const eslintrcPath = path.join(ROOT_DIR, '.eslintrc.js');
            const eslintrcJsonPath = path.join(ROOT_DIR, '.eslintrc.json');

            const hasEslintConfig =
                fs.existsSync(eslintPath) || fs.existsSync(eslintrcPath) || fs.existsSync(eslintrcJsonPath);

            expect(hasEslintConfig).toBe(true);
        });

        it('should have prettier config file', () => {
            const prettierPath = path.join(ROOT_DIR, '.prettierrc');
            const prettierJsPath = path.join(ROOT_DIR, 'prettier.config.js');

            const hasPrettierConfig = fs.existsSync(prettierPath) || fs.existsSync(prettierJsPath);

            expect(hasPrettierConfig).toBe(true);
        });
    });

    describe('Environment Variables (AC: 5)', () => {
        it('should have .env.example or similar template', () => {
            const envExamplePath = path.join(ROOT_DIR, '.env.example');
            const envLocalPath = path.join(ROOT_DIR, '.env.local');

            const hasEnvTemplate = fs.existsSync(envExamplePath) || fs.existsSync(envLocalPath);

            expect(hasEnvTemplate).toBe(true);
        });

        it('should have .env in .gitignore', () => {
            const gitignorePath = path.join(ROOT_DIR, '.gitignore');
            const gitignore = fs.readFileSync(gitignorePath, 'utf-8');

            expect(gitignore).toContain('.env');
        });
    });

    describe('Docker Configuration (AC: 6)', () => {
        it('should have docker directory', () => {
            const dockerDir = path.join(ROOT_DIR, 'docker');
            expect(fs.existsSync(dockerDir)).toBe(true);
        });

        it('should have docker-compose file for local development', () => {
            const dockerDir = path.join(ROOT_DIR, 'docker');
            const files = fs.readdirSync(dockerDir);

            const hasComposeFile = files.some(
                (f) => f.includes('docker-compose') && (f.endsWith('.yml') || f.endsWith('.yaml')),
            );

            expect(hasComposeFile).toBe(true);
        });
    });

    describe('Nx Configuration', () => {
        it('should have nx.json', () => {
            const nxJsonPath = path.join(ROOT_DIR, 'nx.json');
            expect(fs.existsSync(nxJsonPath)).toBe(true);
        });

        it('should have package.json with nx dependency', () => {
            const packageJsonPath = path.join(ROOT_DIR, 'package.json');
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

            const hasNx = packageJson.dependencies?.nx || packageJson.devDependencies?.nx;

            expect(hasNx).toBeDefined();
        });

        it('should use pnpm as package manager', () => {
            const pnpmLockPath = path.join(ROOT_DIR, 'pnpm-lock.yaml');
            expect(fs.existsSync(pnpmLockPath)).toBe(true);
        });
    });

    describe('Database Library Structure', () => {
        const dbDir = path.join(ROOT_DIR, 'libs', 'db', 'src');

        it('should have entities directory', () => {
            expect(fs.existsSync(path.join(dbDir, 'entities'))).toBe(true);
        });

        it('should have migrations directory', () => {
            expect(fs.existsSync(path.join(dbDir, 'migrations'))).toBe(true);
        });

        it('should have data-source.ts', () => {
            expect(fs.existsSync(path.join(dbDir, 'data-source.ts'))).toBe(true);
        });

        it('should have seeds directory', () => {
            expect(fs.existsSync(path.join(dbDir, 'seeds'))).toBe(true);
        });

        it('should have index.ts barrel export', () => {
            expect(fs.existsSync(path.join(dbDir, 'index.ts'))).toBe(true);
        });
    });

    describe('Project JSON Configurations', () => {
        it('should have valid project.json for api app', () => {
            const projectJsonPath = path.join(ROOT_DIR, 'apps', 'api', 'project.json');
            const projectJson = JSON.parse(fs.readFileSync(projectJsonPath, 'utf-8'));

            expect(projectJson.name).toBeDefined();
            expect(projectJson.targets).toBeDefined();
        });

        it('should have valid project.json for db lib', () => {
            const projectJsonPath = path.join(ROOT_DIR, 'libs', 'db', 'project.json');
            const projectJson = JSON.parse(fs.readFileSync(projectJsonPath, 'utf-8'));

            expect(projectJson.name).toBe('db');
            expect(projectJson.targets).toBeDefined();
        });
    });
});
