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

export const adminScheduleApi = {
    list: (query: IAdminScheduleQuery = {}): Promise<IAdminScheduleListResponse> =>
        adminApiClient.get<IAdminScheduleListResponse>('/admin/schedule', { params: toQueryParams(query) }),
};
