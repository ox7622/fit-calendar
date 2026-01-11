import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

// Подключаем плагины для работы с временными зонами
dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Получает дату и возвращает дату предыдущего дня
 * @param date Дата
 * @returns Дата предыдущего дня
 */
export const getPreviousDayDate = (date: Date): Date => {
    return dayjs(date).subtract(1, 'day').toDate();
};

/**
 * Обработка Date объекта с учетом временной зоны и проверки оригинальной строки
 * @param dateObject Уже созданный Date объект после трансформации
 * @param originalDateStr Исходная строка даты для определения было ли время указано
 * @param useEndOfDay Если true, устанавливаем конец дня, иначе начало дня (только для дат без времени)
 * @param timezoneStr Временная зона (например, 'Europe/Moscow'). Если не указана, возвращает dateObject как есть
 * @returns Date объект с правильной временной зоной
 */
export const processDateObjectWithTimezone = (
    dateObject: Date,
    originalDateStr: string,
    useEndOfDay = false,
    timezoneStr?: string,
): Date => {
    // Если временная зона не указана, возвращаем объект как есть
    if (!timezoneStr) {
        return dateObject;
    }

    // Проверяем по оригинальной строке, было ли время указано
    const hasTime = originalDateStr.includes(' ') && originalDateStr.includes(':');

    if (hasTime) {
        // Для дат с временем: интерпретируем оригинальную строку в указанной зоне
        return dayjs.tz(originalDateStr, timezoneStr).toDate();
    } else {
        // Для дат без времени: берем только дату из объекта и устанавливаем начало/конец дня в указанной зоне
        const dateStr = dayjs(dateObject).format('YYYY-MM-DD');
        const date = dayjs.tz(dateStr, timezoneStr);
        const dateWithTimezone = useEndOfDay ? date.endOf('day') : date.startOf('day');

        return dateWithTimezone.toDate();
    }
};
