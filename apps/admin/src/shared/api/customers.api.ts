import { adminApiClient } from './client';

export interface IAdminCustomer {
    id: string;
    firstName: string;
    lastName: string | null;
    phone: string;
    email: string | null;
    telegramId: string | null;
    telegramUsername: string | null;
    isActive: boolean;
    notes: string | null;
    reminderMinutes: number;
    createdAt: string;
    updatedAt: string;
}

export interface ICustomerFormPayload {
    firstName: string;
    lastName?: string | null;
    phone: string;
    email?: string | null;
    telegramId?: number | null;
    telegramUsername?: string | null;
    isActive?: boolean;
    notes?: string | null;
}

export interface ICustomerListResponse {
    items: IAdminCustomer[];
    total: number;
    page: number;
    pageSize: number;
}

export interface ICustomerListQuery {
    search?: string;
    isActive?: boolean;
    linkedOnly?: boolean;
    page?: number;
    pageSize?: number;
}

export interface IImportError {
    row: number;
    column?: string;
    message: string;
}

export interface IImportPreview {
    rowsTotal: number;
    rowsToCreate: number;
    rowsToUpdate: number;
    rowsToSkip: number;
    errors: IImportError[];
}

export interface IImportResult {
    created: number;
    updated: number;
    skipped: number;
    errors: IImportError[];
}

function toQueryParams(q: ICustomerListQuery): Record<string, string | number | boolean | undefined> {
    return {
        search: q.search || undefined,
        isActive: q.isActive,
        linkedOnly: q.linkedOnly,
        page: q.page,
        pageSize: q.pageSize,
    };
}

export const adminCustomersApi = {
    list: (query: ICustomerListQuery = {}): Promise<ICustomerListResponse> =>
        adminApiClient.get<ICustomerListResponse>('/admin/customers', { params: toQueryParams(query) }),
    getById: (id: string): Promise<IAdminCustomer> => adminApiClient.get<IAdminCustomer>(`/admin/customers/${id}`),
    create: (payload: ICustomerFormPayload): Promise<IAdminCustomer> =>
        adminApiClient.post<IAdminCustomer>('/admin/customers', payload),
    update: (id: string, payload: Partial<ICustomerFormPayload>): Promise<IAdminCustomer> =>
        adminApiClient.put<IAdminCustomer>(`/admin/customers/${id}`, payload),
    unlink: (id: string): Promise<IAdminCustomer> =>
        adminApiClient.post<IAdminCustomer>(`/admin/customers/${id}/unlink`),
    deleteCustomer: (id: string): Promise<void> => adminApiClient.delete<void>(`/admin/customers/${id}`),

    importDryRun: (file: File): Promise<IImportPreview> => {
        const form = new FormData();
        form.append('file', file);
        return adminApiClient.upload<IImportPreview>('/admin/customers/import', form);
    },

    importCommit: (file: File): Promise<IImportResult> => {
        const form = new FormData();
        form.append('file', file);
        return adminApiClient.upload<IImportResult>('/admin/customers/import?commit=true', form);
    },
};
