"use server";

import { z } from "zod";
import {
  addCard,
  addStat,
  checkHeroImages,
  listCards,
  listStats,
  removeListRow,
  reorderList,
  saveHome,
  setCardStatus,
  setStatStatus,
  updateCard,
  updateStat,
  type CardRow,
  type StatRow,
} from "@/lib/admin/home";
import { failed, guard, type Outcome } from "@/lib/admin/outcome";
import { adminAction } from "@/lib/auth/admin-action";
import { CONTENT_TAGS } from "@/lib/content/cache";
import { invalidateContent } from "@/lib/content/invalidate";
import { uuidSchema, versionSchema } from "@/lib/validation/common";
import { heroCardSchema, homeFormSchema, homeStatSchema } from "@/lib/validation/home";

const roles: ("owner" | "editor")[] = ["owner", "editor"];

/**
 * Every change expires the `home` cache tag at once (read-your-own-writes), so the public page shows it on the next request. No
 * revalidatePath for this admin page: like the settings form, the editor keeps their page and the form tracks the new version itself.
 */
const changed = () => invalidateContent(CONTENT_TAGS.home);

/** The singleton: the texts, the two pictures, the rating and the status bar. A stale version is a conflict (nothing is written). */
export const saveHomeAction = adminAction(
  { roles, schema: homeFormSchema.safeExtend({ version: versionSchema }) },
  async ({ tx, input }): Promise<Outcome<{ version: number }>> => {
    const { version, ...values } = input;
    const imageErrors = await checkHeroImages(tx, values.heroImageBaseId, values.heroImageHoverId);
    const [field, message] = Object.entries(imageErrors)[0] ?? [];
    if (field && message) return failed(message, field);
    const outcome = await guard(tx, (sp) => saveHome(sp, version, values));
    if (outcome.kind !== "ok") return outcome;
    changed();
    return { kind: "ok", value: { version: outcome.value } };
  },
);

// ---------------------------------------------------------------- hero cards
type Cards = { rows: CardRow[] };
const cardsAfter = async (tx: Parameters<typeof listCards>[0]): Promise<Outcome<Cards>> => ({ kind: "ok", value: { rows: await listCards(tx) } });

export const addCardAction = adminAction({ roles, schema: heroCardSchema }, async ({ tx, input }): Promise<Outcome<Cards>> => {
  const outcome = await guard(tx, (sp) => addCard(sp, input));
  if (outcome.kind !== "ok") return outcome;
  changed();
  return cardsAfter(tx);
});

export const updateCardAction = adminAction(
  { roles, schema: heroCardSchema.extend({ id: uuidSchema, version: versionSchema }) },
  async ({ tx, input }): Promise<Outcome<Cards>> => {
    const { id, version, ...values } = input;
    const outcome = await guard(tx, (sp) => updateCard(sp, id, version, values));
    if (outcome.kind !== "ok") return outcome;
    changed();
    return cardsAfter(tx);
  },
);

export const setCardStatusAction = adminAction(
  { roles, schema: z.object({ id: uuidSchema, version: versionSchema, status: z.enum(["draft", "published"]) }) },
  async ({ tx, input }): Promise<Outcome<Cards>> => {
    const outcome = await guard(tx, (sp) => setCardStatus(sp, input.id, input.version, input.status));
    if (outcome.kind !== "ok") return outcome;
    changed();
    return cardsAfter(tx);
  },
);

export const deleteCardAction = adminAction(
  { roles, schema: z.object({ id: uuidSchema, version: versionSchema }) },
  async ({ tx, input }): Promise<Outcome<Cards>> => {
    const outcome = await guard(tx, (sp) => removeListRow(sp, "card", input.id, input.version));
    if (outcome.kind !== "ok") return outcome;
    changed();
    return cardsAfter(tx);
  },
);

export const reorderCardsAction = adminAction({ roles, schema: z.object({ ids: z.array(uuidSchema).min(1).max(5) }) }, async ({ tx, input }): Promise<Outcome<Cards>> => {
  const outcome = await guard(tx, (sp) => reorderList(sp, "card", input.ids));
  if (outcome.kind !== "ok") return outcome;
  if (outcome.value.kind !== "ok") return outcome.value;
  changed();
  return cardsAfter(tx);
});

// -------------------------------------------------------------------- stats
type Stats = { rows: StatRow[] };
const statsAfter = async (tx: Parameters<typeof listStats>[0]): Promise<Outcome<Stats>> => ({ kind: "ok", value: { rows: await listStats(tx) } });

export const addStatAction = adminAction({ roles, schema: homeStatSchema }, async ({ tx, input }): Promise<Outcome<Stats>> => {
  const outcome = await guard(tx, (sp) => addStat(sp, input));
  if (outcome.kind !== "ok") return outcome;
  changed();
  return statsAfter(tx);
});

export const updateStatAction = adminAction(
  { roles, schema: homeStatSchema.extend({ id: uuidSchema, version: versionSchema }) },
  async ({ tx, input }): Promise<Outcome<Stats>> => {
    const { id, version, ...values } = input;
    const outcome = await guard(tx, (sp) => updateStat(sp, id, version, values));
    if (outcome.kind !== "ok") return outcome;
    changed();
    return statsAfter(tx);
  },
);

export const setStatStatusAction = adminAction(
  { roles, schema: z.object({ id: uuidSchema, version: versionSchema, status: z.enum(["draft", "published"]) }) },
  async ({ tx, input }): Promise<Outcome<Stats>> => {
    const outcome = await guard(tx, (sp) => setStatStatus(sp, input.id, input.version, input.status));
    if (outcome.kind !== "ok") return outcome;
    changed();
    return statsAfter(tx);
  },
);

export const deleteStatAction = adminAction(
  { roles, schema: z.object({ id: uuidSchema, version: versionSchema }) },
  async ({ tx, input }): Promise<Outcome<Stats>> => {
    const outcome = await guard(tx, (sp) => removeListRow(sp, "stat", input.id, input.version));
    if (outcome.kind !== "ok") return outcome;
    changed();
    return statsAfter(tx);
  },
);

export const reorderStatsAction = adminAction({ roles, schema: z.object({ ids: z.array(uuidSchema).min(1).max(4) }) }, async ({ tx, input }): Promise<Outcome<Stats>> => {
  const outcome = await guard(tx, (sp) => reorderList(sp, "stat", input.ids));
  if (outcome.kind !== "ok") return outcome;
  if (outcome.value.kind !== "ok") return outcome.value;
  changed();
  return statsAfter(tx);
});
