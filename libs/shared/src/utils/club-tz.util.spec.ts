import { formatInClubTz } from './club-tz.util';

const INSTANT = '2026-06-22T06:00:00Z';

describe('formatInClubTz', () => {
    it('renders HH:mm in the club zone', () => {
        expect(formatInClubTz(INSTANT, 'Europe/Moscow', 'HH:mm')).toBe('09:00');
        expect(formatInClubTz(INSTANT, 'Asia/Yekaterinburg', 'HH:mm')).toBe('11:00');
    });

    it('accepts a Date as well as an ISO string', () => {
        expect(formatInClubTz(new Date(INSTANT), 'Europe/Moscow', 'HH:mm')).toBe('09:00');
    });

    it('formats Russian month names', () => {
        expect(formatInClubTz(INSTANT, 'Europe/Moscow', 'd MMMM')).toBe('22 июня');
    });
});
