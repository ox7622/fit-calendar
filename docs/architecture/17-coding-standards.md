# 17. Coding Standards

## 17.1 TypeScript Configuration

```json
// tsconfig.base.json
{
    "compilerOptions": {
        "strict": true,
        "noImplicitAny": true,
        "strictNullChecks": true,
        "noUnusedLocals": true,
        "noUnusedParameters": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "forceConsistentCasingInFileNames": true
    }
}
```

## 17.2 ESLint Rules

```javascript
// .eslintrc.js
module.exports = {
    extends: ['plugin:@nx/typescript', 'plugin:@typescript-eslint/recommended'],
    rules: {
        '@typescript-eslint/explicit-function-return-type': 'error',
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/no-unused-vars': 'error',
        'no-console': 'warn',
    },
};
```

## 17.3 Naming Conventions

| Element            | Convention      | Example             |
| ------------------ | --------------- | ------------------- |
| Files (components) | PascalCase      | `ClassCard.tsx`     |
| Files (utilities)  | camelCase       | `dateUtils.ts`      |
| Files (types)      | kebab-case      | `schedule-types.ts` |
| Components         | PascalCase      | `ClassCard`         |
| Functions          | camelCase       | `getSchedule`       |
| Constants          | SCREAMING_SNAKE | `MAX_REMINDERS`     |
| Types/Interfaces   | PascalCase      | `ScheduleEntry`     |
| Enums              | PascalCase      | `Difficulty`        |

---
