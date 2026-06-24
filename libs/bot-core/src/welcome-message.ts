/**
 * The /start greeting as Telegram HTML, naming the club when we know it.
 * Provider-neutral: the in-API bot resolves the name via ClubService, the
 * standalone bot fetches it over HTTP — both pass the resolved name (or null).
 */
export function buildWelcomeMessage(clubName: string | null): string {
    const who = clubName ? `клуба «${clubName}»` : 'фитнес-клуба';
    return (
        '<b>Привет! 👋</b>\n\n' +
        `Я бот ${who} — покажу расписание занятий.\n\n` +
        'Команды: /today /week. Кнопка ниже откроет приложение.'
    );
}
