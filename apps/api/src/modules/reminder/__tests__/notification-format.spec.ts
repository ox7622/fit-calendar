import { formatTimingRu } from '../notification-format';

const MSK = 'Europe/Moscow';

describe('formatTimingRu', () => {
    const now = new Date('2026-06-22T06:00:00Z'); // 09:00 MSK

    it('says Сегодня for a class later the same club day', () => {
        expect(formatTimingRu(new Date('2026-06-22T15:00:00Z'), MSK, now)).toBe('Сегодня в 18:00');
    });

    it('says Завтра for the next club day', () => {
        expect(formatTimingRu(new Date('2026-06-23T07:00:00Z'), MSK, now)).toBe('Завтра в 10:00');
    });

    it('uses an explicit date further out', () => {
        expect(formatTimingRu(new Date('2026-06-25T07:00:00Z'), MSK, now)).toBe('25 июня в 10:00');
    });

    it('honours a non-Moscow zone', () => {
        expect(formatTimingRu(new Date('2026-06-22T15:00:00Z'), 'Asia/Yekaterinburg', now)).toBe('Сегодня в 20:00');
    });
});
