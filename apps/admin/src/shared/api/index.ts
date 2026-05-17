export { adminApiClient, ApiError, NetworkError } from './client';
export { adminAuthApi } from './auth.api';
export type { ILoginRequest, ILoginResponse } from './auth.api';
export { adminPlansApi } from './membership-plans.api';
export type { IAdminPlan, IPlanFormPayload, IPlanOption, TDurationUnit } from './membership-plans.api';
export { adminCustomersApi } from './customers.api';
export type { IAdminCustomer, ICustomerFormPayload, ICustomerListResponse, ICustomerListQuery } from './customers.api';
export { adminCoachesApi } from './coaches.api';
export type { IAdminCoach, ICoachOption, ICoachFormPayload, IPhotoUploadResponse } from './coaches.api';
export { adminTrainingTypesApi, DIFFICULTY_LEVELS, IMPACT_TYPES } from './training-types.api';
export { adminClubApi } from './club.api';
export type {
    IAdminClubInfo,
    IClubInfoUpdatePayload,
    IClubLogoUploadResponse,
    IDayHours,
    TDayKey,
    TWorkingHours,
} from './club.api';
export type {
    IAdminTrainingType,
    ITrainingTypeOption,
    ITrainingTypeFormPayload,
    TDifficulty,
    TImpactType,
} from './training-types.api';
export { adminScheduleApi, ALLOWED_DURATIONS } from './schedule.api';
export type {
    IAdminScheduleItem,
    IAdminScheduleListResponse,
    IAdminScheduleQuery,
    IScheduleFormPayload,
    TAdminScheduleStatus,
    TAdminScheduleStatusFilter,
    TAllowedDuration,
} from './schedule.api';
