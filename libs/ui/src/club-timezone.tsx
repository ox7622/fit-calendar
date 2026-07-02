import { DEFAULT_TIME_ZONE } from '@fitcalendar/shared';
import { createContext, useContext, useEffect, useState, type FC, type ReactNode } from 'react';

/** What a club-timezone fetcher must return — a structural subset of each app's club-info DTO. */
export interface ClubTimeZoneSource {
    timezone?: string;
}

export interface ClubTimeZoneContextApi {
    ClubTimeZoneProvider: FC<{ children: ReactNode }>;
    /** The club's IANA timezone for formatting class times. */
    useClubTimeZone: () => string;
}

/**
 * Builds a club-timezone React context bound to a given fetcher. Each app passes
 * its own typed API call (mini-app `clubApi.getInfo`, admin `adminClubApi.get`);
 * the provider fetches once on mount and serves `DEFAULT_TIME_ZONE` while loading
 * or on error, so class times always render in a sane club-local zone instead of
 * the viewer's device zone.
 */
export function createClubTimeZoneContext(fetchSource: () => Promise<ClubTimeZoneSource>): ClubTimeZoneContextApi {
    const ClubTimeZoneContext = createContext<string>(DEFAULT_TIME_ZONE);

    const ClubTimeZoneProvider: FC<{ children: ReactNode }> = ({ children }) => {
        const [tz, setTz] = useState<string>(DEFAULT_TIME_ZONE);

        useEffect(() => {
            let cancelled = false;
            fetchSource()
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
    };

    return {
        ClubTimeZoneProvider,
        useClubTimeZone: () => useContext(ClubTimeZoneContext),
    };
}
