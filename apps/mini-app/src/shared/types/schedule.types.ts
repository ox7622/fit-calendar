export interface ScheduleClass {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    coachName: string;
    coachPhotoUrl: string | null;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    impactTypes: string[];
    status: 'scheduled' | 'cancelled';
}

export interface DaySchedule {
    date: string;
    classes: ScheduleClass[];
}
