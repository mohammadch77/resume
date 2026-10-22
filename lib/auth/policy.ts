import {
  ROTATION_GRACE_MS,
  SESSION_IDLE_MS,
  SESSION_ROTATE_MS,
  SESSION_TOUCH_MS,
} from "./config";

/** Sliding expiry, capped by the absolute expiry. */
export function slidingExpiry(now: Date, absoluteExpiresAt: Date): Date {
  return new Date(Math.min(now.getTime() + SESSION_IDLE_MS, absoluteExpiresAt.getTime()));
}

/** A session that is being rotated out has its expiry cut to the grace window; it must not rotate again. */
function isRotatingOut(expiresAt: Date, now: Date): boolean {
  return expiresAt.getTime() - now.getTime() <= ROTATION_GRACE_MS;
}

export function shouldRotate(createdAt: Date, expiresAt: Date, now: Date): boolean {
  return !isRotatingOut(expiresAt, now) && now.getTime() - createdAt.getTime() >= SESSION_ROTATE_MS;
}

export function shouldTouch(expiresAt: Date, absoluteExpiresAt: Date, now: Date): boolean {
  if (isRotatingOut(expiresAt, now)) return false;
  const target = slidingExpiry(now, absoluteExpiresAt).getTime();
  return target - expiresAt.getTime() >= SESSION_TOUCH_MS;
}

export function isExpired(expiresAt: Date, absoluteExpiresAt: Date, now: Date): boolean {
  return expiresAt.getTime() <= now.getTime() || absoluteExpiresAt.getTime() <= now.getTime();
}

export function isLocked(lockedUntil: Date | null, now: Date): boolean {
  return lockedUntil !== null && lockedUntil.getTime() > now.getTime();
}
