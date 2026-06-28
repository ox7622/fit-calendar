import { DEFAULT_TIME_ZONE } from '@fitcalendar/shared';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { clubApi } from './api/club.api';

const ClubTimeZoneContext = createContext<string>(DEFAULT_TIME_ZONE);

/**
 * Fetches the club timezone once and provides it to the tree. While loading (or
 * on error) it serves DEFAULT_TIME_ZONE, so class times always render in a sane
 * club-local zone instead of the viewer's device zone.
 */
export function ClubTimeZoneProvider({ children }: { children: ReactNode }) {
    const [tz, setTz] = useState<string>(DEFAULT_TIME_ZONE);

    useEffect(() => {
        let cancelled = false;
        clubApi
            .getInfo()
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
