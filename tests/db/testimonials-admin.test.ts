import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, describe, expect, it } from "vitest";
import { guard } from "@/lib/admin/outcome";
import { createTestimonial, deleteTestimonial, getTestimonial, listTestimonials, setTestimonialStatus, updateTestimonial } from "@/lib/admin/testimonials";
import type { Db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { withActor } from "@/lib/db/with-actor";
import type { TestimonialFormValues } from "@/lib/validation/testimonial";
import { connect, mkClient, mkIndustry, mkProject, mkUser } from "./helpers";

const pools = connect();
const db = drizzle(pools.app, { schema }) as Db;
afterAll(() => pools.close());

async function fixture() {
  const userId = await mkUser(pools.su, "editor");
  const clientId = await mkClient(pools.su);
  const values = (over: Partial<TestimonialFormValues> = {}): TestimonialFormValues => ({
    clientId, projectId: "", authorName: "علی رضایی", authorRole: "", quote: "همکاری با این تیم بسیار حرفه‌ای بود.", consentConfirmed: true, ...over,
  });
  const run = <T>(fn: Parameters<typeof withActor<T>>[3]) => withActor(db, userId, null, fn);
  return { values, run, clientId };
}

describe("testimonials admin", () => {
  it("round-trips fields, storing blank optional values as NULL", async () => {
    const f = await fixture();
    const project = await mkProject(pools.su, await mkIndustry(pools.su));
    const id = await f.run((tx) => createTestimonial(tx, f.values({ authorRole: "مدیر فروش", projectId: project })));
    expect((await getTestimonial(db, id))!.values).toMatchObject({ authorRole: "مدیر فروش", projectId: project, consentConfirmed: true });
    const bare = await f.run((tx) => createTestimonial(tx, f.values()));
    expect((await getTestimonial(db, bare))!.values).toMatchObject({ authorRole: "", projectId: "" });
    expect((await listTestimonials(db)).some((t) => t.id === id)).toBe(true);
  });

  it("reports a stale version as a conflict", async () => {
    const f = await fixture();
    const id = await f.run((tx) => createTestimonial(tx, f.values()));
    await f.run((tx) => updateTestimonial(tx, id, 1, f.values({ authorName: "نفر اول" })));
    expect(await f.run((tx) => guard(tx, (sp) => updateTestimonial(sp, id, 1, f.values({ authorName: "نفر دوم" }))))).toEqual({ kind: "conflict" });
    expect((await getTestimonial(db, id))!.values.authorName).toBe("نفر اول");
  });

  it("cannot be published without the client's consent, and says why", async () => {
    const f = await fixture();
    const id = await f.run((tx) => createTestimonial(tx, f.values({ consentConfirmed: false })));
    expect(await f.run((tx) => guard(tx, (sp) => setTestimonialStatus(sp, id, 1, "published")))).toEqual({
      kind: "blocked",
      reasons: ["رضایت مشتری برای انتشار تأیید نشده است."],
    });
    await f.run((tx) => updateTestimonial(tx, id, 1, f.values({ consentConfirmed: true })));
    await f.run((tx) => setTestimonialStatus(tx, id, 2, "published"));
    expect((await getTestimonial(db, id))!.status).toBe("published");
  });

  it("refuses to withdraw consent from a published testimonial", async () => {
    const f = await fixture();
    const id = await f.run((tx) => createTestimonial(tx, f.values()));
    await f.run((tx) => setTestimonialStatus(tx, id, 1, "published"));
    const outcome = await f.run((tx) => guard(tx, (sp) => updateTestimonial(sp, id, 2, f.values({ consentConfirmed: false }))));
    expect(outcome.kind).toBe("blocked");
    expect((await getTestimonial(db, id))!.values.consentConfirmed).toBe(true);
  });

  it("refuses to publish sample text and rejects an illegal transition", async () => {
    const f = await fixture();
    const sample = await f.run((tx) => createTestimonial(tx, f.values({ quote: "نمونه: این نظر باید جایگزین شود." })));
    const blocked = await f.run((tx) => guard(tx, (sp) => setTestimonialStatus(sp, sample, 1, "published")));
    expect(blocked).toMatchObject({ kind: "blocked" });

    const id = await f.run((tx) => createTestimonial(tx, f.values()));
    const illegal = await f.run((tx) => guard(tx, (sp) => setTestimonialStatus(sp, id, 1, "archived")));
    expect(illegal).toEqual({ kind: "failed", message: "این تغییر وضعیت مجاز نیست." });
  });

  it("refuses to delete a published testimonial, then deletes it once it is a draft", async () => {
    const f = await fixture();
    const id = await f.run((tx) => createTestimonial(tx, f.values()));
    await f.run((tx) => setTestimonialStatus(tx, id, 1, "published"));
    expect(await f.run((tx) => deleteTestimonial(tx, id, 2))).toEqual({ ok: false, reason: "published" });
    await f.run((tx) => setTestimonialStatus(tx, id, 2, "draft"));
    expect(await f.run((tx) => deleteTestimonial(tx, id, 3))).toEqual({ ok: true });
    expect(await getTestimonial(db, id)).toBeNull();
  });
});
