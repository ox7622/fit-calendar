/** Schedule changes only push to users when the class falls within this many
 *  days from now. Shared by the API's authoritative gate and the admin UI's
 *  mirror so the window can't drift between them. */
export const NOTIFY_WINDOW_DAYS = 5;
