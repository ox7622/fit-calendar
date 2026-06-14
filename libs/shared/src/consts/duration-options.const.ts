/** Sanity bounds for class durations — the curated list lives in the
 *  `duration_options` admin table; these are the floor/ceiling both the API
 *  validator and the admin form clamp to. */
export const DURATION_OPTION_MIN_MINUTES = 5;
export const DURATION_OPTION_MAX_MINUTES = 480;
