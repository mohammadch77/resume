"use server";
// public-action: runs before any session exists, so it cannot use adminAction.

import { randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { LOGIN_ERROR } from "@/lib/auth/config";
import { sessionCookie } from "@/lib/auth/cookie";
import { attemptLogin } from "@/lib/auth/login";
import { RateLimiter } from "@/lib/auth/rate-limit";
import { isAllowedOrigin, requestMeta, siteOrigin } from "@/lib/auth/request";
import { getDb } from "@/lib/db/client";
import { env } from "@/lib/env";

export type LoginState = { error: string | null };

const schema = z.object({
  email: z.string().trim().toLowerCase().min(1).max(254),
  password: z.string().min(1).max(200),
});

let limiter: RateLimiter | undefined;

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const h = await headers();
  if (!isAllowedOrigin(h.get("origin"), siteOrigin())) return { error: LOGIN_ERROR };

  const meta = requestMeta(h);
  limiter ??= new RateLimiter(env().LOGIN_RATE_LIMIT_PER_MIN, 60_000);
  if (meta.ipHash && !limiter.allow(meta.ipHash)) return { error: LOGIN_ERROR };

  const parsed = schema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: LOGIN_ERROR };

  const result = await attemptLogin(getDb(), parsed.data, { ...meta, requestId: randomUUID() });
  if (!result.ok) return { error: LOGIN_ERROR };

  (await cookies()).set(sessionCookie(result.session.token, result.session.expiresAt));
  redirect("/admin");
}
