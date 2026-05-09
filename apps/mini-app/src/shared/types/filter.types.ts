export interface ScheduleFilters {
    difficultyLevel?: string;
    impactType?: string[];
    trainingTypeId?: string;
    coachId?: string;
}

export interface TrainingTypeOption {
    id: string;
    name: string;
}

export interface CoachOption {
    id: string;
    name: string;
    photoUrl: string | null;
    specializations?: string[];
}
