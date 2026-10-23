"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ConflictDialog } from "@/components/admin/conflict-dialog";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { OutcomeMessage } from "@/components/admin/outcome-message";
import { Button } from "@/components/ui/button";
import type { Outcome } from "@/lib/admin/outcome";
import type { ActionResult } from "@/lib/auth/admin-action-core";

export type ContentStatus = "draft" | "published" | "archived";

/** A server action wrapped in adminAction, as the client sees it. */
type Call<I> = (input: I) => Promise<ActionResult<Outcome<unknown>>>;

type Props = {
  id: string;
  title: string;
  version: number;
  status: ContentStatus;
  /** What the delete dialog calls the item, e.g. "پروژه". */
  noun: string;
  setStatus: Call<{ id: string; version: number; status: ContentStatus }>;
  remove: Call<{ id: string; version: number }>;
  /** Reorder arrows (list pages only). */
  move?: { first: boolean; last: boolean; action: Call<{ id: string; direction: "up" | "down" }> };
  /** Where to go after a delete (the edit page leaves; the list stays). */
  afterDelete?: string;
};

const STATUS_BUTTONS: Record<ContentStatus, Array<{ to: ContentStatus; label: string }>> = {
  draft: [{ to: "published", label: "انتشار" }],
  published: [
    { to: "draft", label: "لغو انتشار" },
    { to: "archived", label: "بایگانی" },
  ],
  archived: [{ to: "draft", label: "بازگرداندن به پیش‌نویس" }],
};

/** Publish / unpublish / archive, reorder and delete for one content item. Publish failures list exactly what is missing. */
export function ContentRowActions({ id, title, version, status, noun, setStatus, remove, move, afterDelete }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [outcome, setOutcome] = useState<Outcome<unknown> | null>(null);
  const [conflict, setConflict] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const run = (call: () => Promise<ActionResult<Outcome<unknown>>>, after?: () => void) =>
    start(async () => {
      const r = await call();
      const next: Outcome<unknown> = r.ok ? r.data : { kind: "failed", message: r.message };
      if (next.kind === "conflict") return setConflict(true);
      setOutcome(next);
      if (next.kind === "ok") after?.();
    });

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        {move ? (
          <>
            <Button type="button" size="sm" variant="outline" disabled={pending || move.first} aria-label={`بالاتر بردن ${title}`} onClick={() => run(() => move.action({ id, direction: "up" }))}>
              ↑
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={pending || move.last} aria-label={`پایین‌تر بردن ${title}`} onClick={() => run(() => move.action({ id, direction: "down" }))}>
              ↓
            </Button>
          </>
        ) : null}
        {STATUS_BUTTONS[status].map((b) => (
          <Button key={b.to} type="button" size="sm" variant="outline" disabled={pending} onClick={() => run(() => setStatus({ id, version, status: b.to }), () => router.refresh())}>
            {b.label}
          </Button>
        ))}
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => setConfirmDelete(true)}>
          حذف
        </Button>
      </div>
      <OutcomeMessage outcome={outcome} />
      <ConfirmDialog
        open={confirmDelete}
        title={`حذف «${title}»؟`}
        description={`این ${noun} از فهرست و از سایت برداشته می‌شود.`}
        confirmLabel="حذف"
        destructive
        pending={pending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() =>
          run(() => remove({ id, version }), () => {
            setConfirmDelete(false);
            if (afterDelete) router.push(afterDelete);
          })
        }
      />
      <ConflictDialog open={conflict} onClose={() => setConflict(false)} onReload={() => router.refresh()} />
    </div>
  );
}
