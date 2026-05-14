import { normalizeRussianPhone } from '../phone';

describe('normalizeRussianPhone', () => {
    describe('canonical output for valid Russian numbers', () => {
        it.each([
            ['+7 (495) 123-45-67', '+74951234567'],
            ['8-495-123-45-67', '+74951234567'],
            ['74951234567', '+74951234567'],
            ['84951234567', '+74951234567'],
            ['4951234567', '+74951234567'],
            ['+7 999 555 12 34', '+79995551234'],
            ['8 (812) 000-00-00', '+78120000000'],
        ])('normalizes %j → %j', (input, expected) => {
            expect(normalizeRussianPhone(input)).toBe(expected);
        });
    });

    describe('rejects non-normalizable input', () => {
        it.each([
            ['+1 555 1234567', 'US number — wrong digit count'],
            ['+44 20 7946 0958', 'UK number'],
            ['abc', 'no digits'],
            ['', 'empty'],
            ['12345', 'too short'],
            ['+7 495 123', 'Russian shape but wrong length'],
            ['+7 999 555 1234 5', '12 digits — too long'],
        ])('returns null for %j (%s)', (input) => {
            expect(normalizeRussianPhone(input)).toBeNull();
        });
    });

    it('handles purely-digit 10-char Russian numbers (no country code)', () => {
        expect(normalizeRussianPhone('9991234567')).toBe('+79991234567');
    });

    it('strips all non-digit chars before checking length', () => {
        expect(normalizeRussianPhone('+7-(999)__123_45_67')).toBe('+79991234567');
    });
});
