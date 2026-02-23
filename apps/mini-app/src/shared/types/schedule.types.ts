export interface ScheduleClass {
    id: string;
    name: string;
    description?: string | null;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    coachId?: string;
    coachName: string;
    coachPhotoUrl: string | null;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    impactTypes: string[];
    equipment?: string[];
    status: 'scheduled' | 'cancelled';
}

export interface DaySchedule {
    date: string;
    classes: ScheduleClass[];
}
