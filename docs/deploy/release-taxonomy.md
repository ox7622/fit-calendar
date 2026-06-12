# Деплой релиза «Таксономия (сложность / нагрузка)»

Релиз вводит управление уровнями сложности и типами нагрузки из админки и
переводит админку + мини-апп с захардкоженных списков на API таксономии.

## ⚠️ Перед началом — два важных факта

1. **Прод деплоится с `develop`, а работа велась на `feat/sprint1`** (на момент
   написания — на 27 коммитов впереди `develop`). Бэкенд таксономии (модуль +
   миграция `AddTaxonomyTables`) и весь фронт лежат только на `feat/sprint1`.
   Задеплоить можно лишь смёржив `feat/sprint1 → develop` — и это вынесет в прод
   **все** опередившие коммиты, не только таксономию. Убедись, что это твой релиз.
2. На сервере **нет `.git`** (код заливался `git archive`), поэтому `git pull`
   там не работает — обновление только через `git archive`. `git archive`
   **перезапишет** `docker-compose.prod.yml` версией из репо: если на сервере
   остались ручные правки compose (ротация логов `x-logging`), они затрутся.
   `.env.prod` не тронется (его нет в репозитории).

## Шаг 1. Влить в develop и запушить (локально, Node 22)

```bash
nvm use 22.13.1
git fetch origin
git checkout develop && git pull --ff-only origin develop
git merge feat/sprint1
git push origin develop
```

> ⚠️ На `develop` коммитит параллельный агент. Обязательно `git pull --ff-only`
> перед мёржем; если push отбивается — разбирайся вручную, **не** делай слепой
> `git push --force`.

## Шаг 2. Залить код на сервер

```bash
git archive develop | ssh root@45.38.249.222 'tar -x -C /opt/fit-calendar'
```

## Шаг 3. Пересобрать образы — ПО ОДНОМУ (иначе OOM на 2 ГБ RAM)

Релиз меняет **и бэкенд** (новый taxonomy-модуль), **и оба фронта** (admin +
mini-app) → пересобираем **оба** образа, последовательно:

```bash
ssh root@45.38.249.222
cd /opt/fit-calendar
docker compose --env-file .env.prod -f docker/docker-compose.prod.yml build api
docker compose --env-file .env.prod -f docker/docker-compose.prod.yml build caddy
docker compose --env-file .env.prod -f docker/docker-compose.prod.yml up -d
```

## Шаг 4. Миграция — автоматически

При старте контейнера `api` выполняется `pnpm db:migrate:prod` (см. CMD в
`docker/Dockerfile.prod-api`) → `AddTaxonomyTables` создаёт таблицы
`difficulty_levels` / `impact_types` и **сеет дефолты** (Начальный/Средний/
Продвинутый, Кардио/Силовая/Гибкость/Баланс — с теми же ключами и цветами, что
были захардкожены). Существующие занятия продолжают рендериться. Идемпотентно.

Проверка в логах:

```bash
docker compose -f docker/docker-compose.prod.yml logs api | grep -i "AddTaxonomyTables\|migration"
```

## Шаг 5. Приёмка

```bash
curl -s https://api.fit-calendar.ru/api/taxonomy   # → 200 + difficultyLevels/impactTypes
```

- `https://admin.fit-calendar.ru/taxonomy` — список грузится; добавление,
  перестановка ↑/↓, скрытие, удаление работают (удаление используемого даёт 409).
- Мини-апп: сложность/нагрузка на карточках занятий, в деталях и в фильтрах
  тянутся с `/taxonomy`.

## Откат

- БД: ежедневный бэкап; при желании снять вручную перед миграцией. Восстановление —
  раздел «Восстановление БД» в `docs/deploy/deploy-steps.md`.
- Код: задеплоить предыдущий коммит `develop` тем же `git archive`.
