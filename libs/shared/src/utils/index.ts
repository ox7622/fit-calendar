// `date-time.util` is NOT barrel-re-exported because it eagerly calls
// `dayjs.extend()` at module load, which makes it impossible to tree-shake
// out of the mini-app bundle (the eager call counts as a side effect).
// Import it directly via `@fitcalendar/shared/utils/date-time.util` if you
// need it — the only consumers historically were inside libs/shared itself.
export * from './format-russian.util';
