"use server";
// public-action: runs for anonymous visitors, so it cannot use adminAction. Its own gates are in lib/leads/submit.ts.

import { headers } from "next/headers";
import { after } from "next/server";
import { RateLimiter } from "@/lib/auth/rate-limit";
import { requestMeta, siteOrigin } from "@/lib/auth/request";
import { getDb } from "@/lib/db/client";
import { notifyLead } from "@/lib/leads/notify";
import type { ContactState } from "@/lib/leads/state";
import { submitContact } from "@/lib/leads/submit";

// One limiter per rule (in memory, per instance). Nginx limit_req is the first layer in production (Phase 8).
const limiters = new Map<string, RateLimiter>();
function allow(key: string, limit: { max: number; windowMs: number }): boolean {
  const rule = key.startsWith("ip:") ? "ip" : "global";
  let limiter = limiters.get(rule);
  if (!limiter) {
    limiter = new RateLimiter(limit.max, limit.windowMs);
    limiters.set(rule, limiter);
  }
  return limiter.allow(key);
}

export async function submitContactAction(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const h = await headers();
  return submitContact(
    {
      db: getDb(),
      now: Date.now(),
      origin: h.get("origin"),
      siteOrigin: siteOrigin(),
      ipHash: requestMeta(h).ipHash,
      allow,
      notify: (lead) => after(() => notifyLead(lead)),
    },
    Object.fromEntries(formData),
  );
}
