import { hash, verify } from "@node-rs/argon2";

// Argon2id is the library default; parameters follow the OWASP minimum (19 MiB, t=2, p=1).
const OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, OPTIONS);
}

let dummyHash: Promise<string> | undefined;

/**
 * Verifies a password. When there is no stored hash (unknown user) a dummy hash is verified
 * instead, so the response time does not reveal whether the account exists.
 */
export async function verifyPassword(storedHash: string | null, plain: string): Promise<boolean> {
  dummyHash ??= hashPassword("grin-web-timing-equalizer");
  const target = storedHash ?? (await dummyHash);
  const ok = await verify(target, plain).catch(() => false);
  return storedHash !== null && ok;
}
