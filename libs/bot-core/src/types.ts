/** A single class as the bot renders it — provider-neutral (no API DTO coupling). */
export interface IClassEntry {
    name: string;
    startTime: string; // ISO 8601
    durationMinutes: number;
    status: 'scheduled' | 'cancelled';
    coachName: string;
}

/** One day of the weekly schedule. `date` is a YYYY-MM-DD key. */
export interface IWeekDay {
    date: string;
    classes: IClassEntry[];
}

/**
 * Where the bot gets schedule data. The standalone bot implements this over HTTP;
 * the in-API webhook bot implements it over ScheduleService. This is the only
 * difference between the two bots.
 */
export interface ScheduleDataSource {
    getToday(): Promise<IClassEntry[]>;
    getByDate(dateKey: string): Promise<IClassEntry[]>;
    getWeek(weekOffset: number): Promise<IWeekDay[]>;
    /** The club's IANA timezone, resolved per command so admin edits take effect live. */
    getTimeZone(): Promise<string>;
}
