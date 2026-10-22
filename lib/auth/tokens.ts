import { createHash, createHmac, randomBytes } from "node:crypto";

export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

/** What is stored in `sessions.id`; the raw token only ever lives in the cookie. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** sha256(ip + daily salt). The salt is an HMAC of the UTC date, so hashes cannot be linked across days. */
export function hashIp(ip: string, secret: string, now: Date = new Date()): string {
  const day = now.toISOString().slice(0, 10);
  const salt = createHmac("sha256", secret).update(day).digest("hex");
  return createHash("sha256").update(ip + salt).digest("hex");
}
