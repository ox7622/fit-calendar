import { createClubTimeZoneContext } from '@fitcalendar/ui';

import { clubApi } from './api/club.api';

// Club-timezone context, bound to the mini-app's public club-info fetch.
export const { ClubTimeZoneProvider, useClubTimeZone } = createClubTimeZoneContext(() => clubApi.getInfo());
