# S3 lifecycle policy для бэкапов

> Цель: автоматически прорежать историю бэкапов в S3-бакете по схеме
> **7 дневных + 5 недельных + ~13 месячных**, без скриптов на стороне сервера.
> Логика выполняется самим S3-провайдером (AWS / Selectel / Yandex Object
> Storage / MinIO).

## Что делает `backup.sh` и что — lifecycle

| Кто | Что делает | Когда |
|---|---|---|
| `backup.sh` | Грузит дамп в `daily/<file>.sql.gz` | Каждый день |
| `backup.sh` | Server-side COPY `daily/ → weekly/` | По воскресеньям |
| `backup.sh` | Server-side COPY `daily/ → monthly/` | 1-го числа месяца |
| S3 lifecycle | Удаляет объекты из `daily/` старше 7 дней | Сам, по cron внутри S3 |
| S3 lifecycle | Удаляет объекты из `weekly/` старше 35 дней | Сам |
| S3 lifecycle | Удаляет объекты из `monthly/` старше 400 дней | Сам |

Server-side COPY — бесплатная операция (объект не пересылается через сервер,
S3 копирует у себя). Поэтому хранение трёх копий стоит ровно в три раза
дороже одной, без накладных на трафик.

## Что в JSON-файле

`docs/deploy/s3-lifecycle.json` — готовый к применению policy:

| Rule ID | Префикс | Удалять после |
|---|---|---|
| `expire-daily-7d` | `daily/` | 7 дней |
| `expire-weekly-35d` | `weekly/` | 35 дней |
| `expire-monthly-400d` | `monthly/` | 400 дней |
| `abort-incomplete-multipart-7d` | `(весь бакет)` | 7 дней висящих недозалитых multipart |

Последнее правило — гигиена. Если сетка моргнёт во время загрузки большого
дампа, S3 оставит «висящий» multipart-upload, за который ты платишь, но
который не виден через `s3 ls`. Без правила они копятся месяцами.

## Применить (AWS / любой S3-совместимый провайдер)

```bash
docker run --rm \
    -v "$(pwd)/docs/deploy:/cfg:ro" \
    -e AWS_ACCESS_KEY_ID \
    -e AWS_SECRET_ACCESS_KEY \
    -e AWS_DEFAULT_REGION=ru-1 \
    amazon/aws-cli:latest \
    s3api put-bucket-lifecycle-configuration \
    --bucket fitcalendar-backups \
    --lifecycle-configuration file:///cfg/s3-lifecycle.json \
    --endpoint-url https://s3.ru-1.storage.selcloud.ru
```

Для AWS — убери `--endpoint-url`.
Для Yandex Object Storage — `--endpoint-url https://storage.yandexcloud.net`.

## Проверить, что применилось

```bash
docker run --rm \
    -e AWS_ACCESS_KEY_ID \
    -e AWS_SECRET_ACCESS_KEY \
    -e AWS_DEFAULT_REGION=ru-1 \
    amazon/aws-cli:latest \
    s3api get-bucket-lifecycle-configuration \
    --bucket fitcalendar-backups \
    --endpoint-url https://s3.ru-1.storage.selcloud.ru
```

Должен вернуться тот же JSON, который заливали.

## Особенности конкретных провайдеров

### Selectel S3
- Lifecycle поддерживается полностью с 2024 г. (раньше было «частично»).
- Прогон lifecycle — раз в сутки в служебное окно (точное время не публикуют).
- Endpoint: `https://s3.ru-1.storage.selcloud.ru` (или ru-7, в зависимости от
  региона бакета).

### Yandex Object Storage
- Lifecycle поддерживается, есть особенности: `Filter` без префикса должен
  использовать `<Filter><Prefix></Prefix></Filter>`, как в JSON выше — это уже
  правильно.
- Прогон — обычно в течение суток.

### AWS S3
- Прогон lifecycle — «при следующей возможности» (UTC midnight ± несколько часов).
- Можно дополнить переходом на холодный класс (Glacier/Deep Archive) для
  `monthly/` — будет дешевле в разы. Пример правила:
  ```json
  {
      "ID": "monthly-to-glacier",
      "Status": "Enabled",
      "Filter": { "Prefix": "monthly/" },
      "Transitions": [{ "Days": 30, "StorageClass": "GLACIER" }],
      "Expiration": { "Days": 400 }
  }
  ```
  Не делать на других провайдерах — у Selectel и Yandex Glacier-классов нет.

### MinIO (если развернёшь свой)
- Поддерживает тот же API. Endpoint — твой собственный.

## Проверочный прогон

После применения policy:

1. **Сразу** залить тестовый файл-«старичок»:
   ```bash
   aws s3 cp test.txt s3://fitcalendar-backups/daily/old.sql.gz \
       --metadata-directive REPLACE --metadata "x-original-date=2020-01-01"
   ```
   Lifecycle смотрит на **дату загрузки**, а не на дату в имени файла —
   поэтому свежезалитый «старый» файл удалится не сразу. Это нормально.

2. **Через сутки-двое** проверить:
   ```bash
   aws s3 ls s3://fitcalendar-backups/daily/ | wc -l   # ≤ 7
   aws s3 ls s3://fitcalendar-backups/weekly/ | wc -l  # ≤ 5
   aws s3 ls s3://fitcalendar-backups/monthly/ | wc -l # ≤ 13
   ```
   Если число файлов растёт неограниченно — policy не применилась или
   применилась к не тому префиксу.

## Сколько это стоит

Прикидка для одного клуба, БД ≈ 200 MB gzip-дамп, Selectel Cold Storage:

| Класс | Файлов | Объём | Цена (Selectel, ~0.36 ₽/ГБ·мес) |
|---|---|---|---|
| daily/ | 7 | ~1.4 GB | ~0.50 ₽/мес |
| weekly/ | 5 | ~1.0 GB | ~0.36 ₽/мес |
| monthly/ | 13 | ~2.6 GB | ~0.94 ₽/мес |
| **Итого** | | ~5 GB | **~2 ₽/мес** |

Стоимость хранения вообще не повод оптимизировать. Стоимость **трафика на
скачивание** при восстановлении (≈ 200 MB) — копейки. Дорого только если
делать частые тестовые восстановления — но это всё равно правильно.

## Edge cases

- **Бэкап в нерабочий день не выполнился** → дыра в `daily/`. Lifecycle не
  «доращивает» отсутствующие копии — это работа алертов из `backup.sh`. Если
  алерт не пришёл, история проседает молча.
- **Перевод сервера в другой timezone** → `date +%u` (день недели) и `date +%d`
  (день месяца) поедут. Перед миграцией зафиксировать `TZ` в cron-entry:
  `0 3 * * * root TZ=Europe/Moscow /opt/fit-calendar/scripts/backup.sh`.
- **Файл одного дня перезаливался дважды** (например, повторный запуск
  `backup.sh` после фикса) → имя одинаковое, второй upload перетрёт первый.
  Это ок — последний выигрывает, lifecycle привязан к новой дате модификации.
- **Сменили домен / клуб / бакет** → старые файлы продолжают тикать к
  expiration в новом бакете тоже, если ты их скопировал с сохранением даты
  модификации. Обычно — нет, дата сбросится на момент копирования.
