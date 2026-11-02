"use client";

import type { z, ZodType } from "zod";
import {
  addCardAction,
  addStatAction,
  deleteCardAction,
  deleteStatAction,
  reorderCardsAction,
  reorderStatsAction,
  setCardStatusAction,
  setStatStatusAction,
  updateCardAction,
  updateStatAction,
} from "@/app/(admin)/admin/(panel)/home/actions";
import { HomeListManager, type ListConfig } from "@/components/admin/home-list-manager";
import type { CardRow, StatRow } from "@/lib/admin/home";
import { MAX_HERO_CARDS, MAX_HOME_STATS, heroCardSchema, homeStatSchema } from "@/lib/validation/home";

/** The first Persian message per field of a Zod schema, or null when the values are valid (the server runs the same schema). */
function validator<S extends ZodType>(schema: S) {
  return (values: Record<string, string>): Record<string, string> | null => {
    const r = schema.safeParse(values);
    if (r.success) return null;
    const out: Record<string, string> = {};
    for (const issue of (r.error as z.ZodError).issues) out[String(issue.path[0])] ??= issue.message;
    return out;
  };
}

const cardConfig: ListConfig<CardRow> = {
  kind: "card",
  title: "کارت‌های هیرو",
  hint: "کارت‌های کنار تیتر که با کلیک عوض می‌شوند. فقط کارت‌های منتشرشده نمایش داده می‌شوند؛ بدون کارت منتشرشده، کارت نمایش داده نمی‌شود.",
  max: MAX_HERO_CARDS,
  fields: [
    { key: "caption", label: "برچسب (حداکثر ۴۰ حرف)", max: 40, narrow: true },
    { key: "title", label: "عنوان (حداکثر ۸۰ حرف)", max: 80 },
  ],
  toFields: (r) => ({ caption: r.caption, title: r.title }),
  summary: (r) => `${r.caption}: ${r.title}`,
  validate: validator(heroCardSchema),
  add: (v) => addCardAction(v),
  update: (v) => updateCardAction(v),
  setStatus: (v) => setCardStatusAction(v),
  remove: (v) => deleteCardAction(v),
  reorder: (v) => reorderCardsAction(v),
};

const statConfig: ListConfig<StatRow> = {
  kind: "stat",
  title: "آمار",
  hint: "تا ۴ عدد واقعی. فقط عددهای منتشرشده نمایش داده می‌شوند؛ بدون عدد منتشرشده، بخش آمار در صفحه نیست. عدد «نمونه» منتشر نمی‌شود.",
  max: MAX_HOME_STATS,
  fields: [
    { key: "value", label: "عدد", max: 6, dir: "ltr", narrow: true },
    { key: "suffix", label: "پسوند (مثل + یا ٪)", max: 4, dir: "ltr", narrow: true },
    { key: "label", label: "عنوان (حداکثر ۶۰ حرف)", max: 60 },
  ],
  toFields: (r) => ({ value: String(r.value), suffix: r.suffix, label: r.label }),
  summary: (r) => `${r.value.toLocaleString("fa-IR", { useGrouping: false })}${r.suffix} ${r.label}`,
  validate: validator(homeStatSchema),
  add: (v) => addStatAction(v),
  update: (v) => updateStatAction(v),
  setStatus: (v) => setStatStatusAction(v),
  remove: (v) => deleteStatAction(v),
  reorder: (v) => reorderStatsAction(v),
};

export const CardsManager = ({ initial }: { initial: CardRow[] }) => <HomeListManager config={cardConfig} initial={initial} />;
export const StatsManager = ({ initial }: { initial: StatRow[] }) => <HomeListManager config={statConfig} initial={initial} />;
