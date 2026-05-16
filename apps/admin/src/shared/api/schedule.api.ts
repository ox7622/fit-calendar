import { adminApiClient } from './client';

export type TAdminScheduleStatus = 'scheduled' | 'cancelled';
export type TAdminScheduleStatusFilter = TAdminScheduleStatus | 'all';

export interface IAdminScheduleItem {
    id: string;
    startTime: string;
    durationMinutes: number;
    status: TAdminScheduleStatus;
    cancellationReason: string | null;
    trainingType: {
        id: string;
        name: string;
        difficulty: 'beginner' | 'intermediate' | 'advanced';
    };
    coach: {
        id: string;
        name: string;
        photoUrl: string | null;
    };
}

export interface IAdminScheduleListResponse {
    items: IAdminScheduleItem[];
    total: number;
    page: number;
    pageSize: number;
}

export interface IAdminScheduleQuery {
    from?: string;
    to?: string;
    coachId?: string;
    trainingTypeId?: string;
    status?: TAdminScheduleStatusFilter;
    page?: number;
    pageSize?: number;
}

function toQueryParams(q: IAdminScheduleQuery): Record<string, string | number | boolean | undefined> {
    return {
        from: q.from,
        to: q.to,
        coachId: q.coachId,
        trainingTypeId: q.trainingTypeId,
        status: q.status,
        page: q.page,
        pageSize: q.pageSize,
    };
}

export interface IScheduleFormPayload {
    trainingTypeId: string;
    coachId: string;
    startTime: string; // ISO 8601
    durationMinutes: number;
}

export const ALLOWED_DURATIONS = [30, 45, 60, 90] as const;
export type TAllowedDuration = (typeof ALLOWED_DURATIONS)[number];

export const adminScheduleApi = {
    list: (query: IAdminScheduleQuery = {}): Promise<IAdminScheduleListResponse> =>
        adminApiClient.get<IAdminScheduleListResponse>('/admin/schedule', { params: toQueryParams(query) }),

    getById: (id: string): Promise<IAdminScheduleItem> =>
        adminApiClient.get<IAdminScheduleItem>(`/admin/schedule/${id}`),

    create: (payload: IScheduleFormPayload): Promise<IAdminScheduleItem> =>
        adminApiClient.post<IAdminScheduleItem>('/admin/schedule', payload),

    update: (id: string, payload: Partial<IScheduleFormPayload>): Promise<IAdminScheduleItem> =>
        adminApiClient.put<IAdminScheduleItem>(`/admin/schedule/${id}`, payload),
};
