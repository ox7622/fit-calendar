import { createClubTimeZoneContext } from '@fitcalendar/ui';

import { adminClubApi } from './api';

// Club-timezone context, bound to the admin's authenticated club-info fetch.
export const { ClubTimeZoneProvider, useClubTimeZone } = createClubTimeZoneContext(() => adminClubApi.get());
