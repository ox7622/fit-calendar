import { DEFAULT_TIME_ZONE, isKnownTimeZone, RUSSIA_TIME_ZONES, RUSSIA_TIME_ZONE_IDS } from './time-zones.const';

describe('Russia time zones', () => {
    it('defaults to Moscow', () => {
        expect(DEFAULT_TIME_ZONE).toBe('Europe/Moscow');
    });

    it('lists 11 zones from Kaliningrad to Kamchatka', () => {
        expect(RUSSIA_TIME_ZONES).toHaveLength(11);
        expect(RUSSIA_TIME_ZONE_IDS[0]).toBe('Europe/Kaliningrad');
        expect(RUSSIA_TIME_ZONE_IDS).toContain('Europe/Moscow');
        expect(RUSSIA_TIME_ZONE_IDS).toContain('Asia/Kamchatka');
    });

    it('every zone has a non-empty Russian label', () => {
        for (const z of RUSSIA_TIME_ZONES) expect(z.label.length).toBeGreaterThan(0);
    });

    it('recognises known ids and rejects junk', () => {
        expect(isKnownTimeZone('Asia/Yekaterinburg')).toBe(true);
        expect(isKnownTimeZone('Mars/Olympus')).toBe(false);
        expect(isKnownTimeZone('')).toBe(false);
    });
});
