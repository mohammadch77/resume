/** Auth policy constants (milliseconds unless noted). */
export const SESSION_COOKIE = "__Host-gw_session";
export const SESSION_IDLE_MS = 12 * 60 * 60 * 1000;
export const SESSION_ABSOLUTE_MS = 7 * 24 * 60 * 60 * 1000;
/** A session older than this is replaced by a fresh one (new token). */
export const SESSION_ROTATE_MS = 30 * 60 * 1000;
/** Expiry is only extended when at least this much idle time has been consumed. */
export const SESSION_TOUCH_MS = 5 * 60 * 1000;
/** After rotation the old token stays valid briefly so parallel requests do not fail. */
export const ROTATION_GRACE_MS = 30 * 1000;

export const MAX_FAILED_LOGINS = 5;
export const LOCKOUT_MS = 15 * 60 * 1000;

/** The only message ever shown for a failed login: unknown email, wrong password, locked, inactive, rate-limited. */
export const LOGIN_ERROR = "ایمیل یا رمز عبور درست نیست.";
