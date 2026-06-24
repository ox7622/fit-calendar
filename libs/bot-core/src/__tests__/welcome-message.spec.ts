import { buildWelcomeMessage } from '../welcome-message';

describe('buildWelcomeMessage', () => {
    it('greets in bold and lists the schedule commands', () => {
        const text = buildWelcomeMessage(null);
        expect(text.startsWith('<b>Привет! 👋</b>')).toBe(true);
        expect(text).toContain('Команды: /today /week');
    });

    it('names the club when known', () => {
        expect(buildWelcomeMessage('Форма')).toContain('клуба «Форма»');
    });

    it('falls back to a generic club reference when unknown', () => {
        expect(buildWelcomeMessage(null)).toContain('фитнес-клуба');
    });
});
