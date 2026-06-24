import { buildClubMessage, type IClubInfo } from '../club-message';

const baseClub: IClubInfo = {
    name: 'Форма',
    address: 'ул. Тестовая, 1',
    phone: null,
    mapUrl: null,
    workingHours: {},
};

describe('buildClubMessage', () => {
    it('renders name and address with the standard emoji + bold header', () => {
        const text = buildClubMessage(baseClub);
        expect(text).toContain('🏛 <b>Форма</b>');
        expect(text).toContain('📍 ул. Тестовая, 1');
        expect(text).toContain('🕐 Часы работы:');
    });

    it('adds a tel: link with non-digits stripped when a phone is present', () => {
        const text = buildClubMessage({ ...baseClub, phone: '+7 (999) 123-45-67' });
        expect(text).toContain('📞 <a href="tel:+79991234567">+7 (999) 123-45-67</a>');
    });

    it('adds the map link only when mapUrl is set', () => {
        expect(buildClubMessage(baseClub)).not.toContain('Открыть на карте');
        const text = buildClubMessage({ ...baseClub, mapUrl: 'https://yandex.ru/maps/?pt=37,55' });
        expect(text).toContain('🗺 <a href="https://yandex.ru/maps/?pt=37,55">Открыть на карте</a>');
    });

    it('escapes HTML-significant characters in club fields', () => {
        const text = buildClubMessage({ ...baseClub, name: 'A & <B>' });
        expect(text).toContain('🏛 <b>A &amp; &lt;B&gt;</b>');
    });

    it('condenses identical consecutive days into a range (lowercase keys)', () => {
        const text = buildClubMessage({
            ...baseClub,
            workingHours: {
                monday: { open: '07:00', close: '23:00' },
                tuesday: { open: '07:00', close: '23:00' },
                wednesday: { open: '07:00', close: '23:00' },
                thursday: { open: '07:00', close: '23:00' },
                friday: { open: '07:00', close: '23:00' },
                saturday: null,
                sunday: null,
            },
        });
        expect(text).toContain('Пн–Пт: 07:00–23:00');
        expect(text).toContain('Сб–Вс: выходной');
    });

    it('accepts short capitalised day keys (Mon…) from the no-record stub', () => {
        const text = buildClubMessage({ ...baseClub, workingHours: { Mon: { open: '09:00', close: '21:00' } } });
        expect(text).toContain('Пн: 09:00–21:00');
    });
});
