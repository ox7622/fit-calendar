import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { DEFAULT_TIME_ZONE } from '@fitcalendar/shared';

import { adminClubApi } from './api';

const ClubTimeZoneContext = createContext<string>(DEFAULT_TIME_ZONE);

/** Fetches the club timezone once; serves DEFAULT_TIME_ZONE while loading/on error. */
export function ClubTimeZoneProvider({ children }: { children: ReactNode }) {
    const [tz, setTz] = useState<string>(DEFAULT_TIME_ZONE);

    useEffect(() => {
        let cancelled = false;
        adminClubApi
            .get()
            .then((info) => {
                if (!cancelled && info.timezone) setTz(info.timezone);
            })
            .catch(() => {
                /* keep the default */
            });
        return () => {
            cancelled = true;
        };
    }, []);

    return <ClubTimeZoneContext.Provider value={tz}>{children}</ClubTimeZoneContext.Provider>;
}

/** The club's IANA timezone for formatting class times. */
export function useClubTimeZone(): string {
    return useContext(ClubTimeZoneContext);
}
