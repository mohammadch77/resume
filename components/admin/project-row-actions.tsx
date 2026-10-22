"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteProjectAction, moveProjectAction, setProjectStatusAction } from "@/app/(admin)/admin/(panel)/projects/actions";
import { ConflictDialog } from "@/components/admin/conflict-dialog";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { OutcomeMessage } from "@/components/admin/outcome-message";
import { Button } from "@/components/ui/button";
import type { Outcome } from "@/lib/admin/outcome";
import type { ProjectStatus } from "@/lib/admin/projects";

type Props = {
  id: string;
  title: string;
  version: number;
  status: ProjectStatus;
  /** Reorder arrows are only shown in the list. `first` / `last` disable the end arrows. */
  move?: { first: boolean; last: boolean };
  /** Where to go after a delete (the edit page leaves; the list stays). */
  afterDelete?: string;
};

const STATUS_BUTTONS: Record<ProjectStatus, Array<{ to: ProjectStatus; label: string }>> = {
  draft: [{ to: "published", label: "انتشار" }],
  published: [
    { to: "draft", label: "لغو انتشار" },
    { to: "archived", label: "بایگانی" },
  ],
  archived: [{ to: "draft", label: "بازگرداندن به پیش‌نویس" }],
};

type ActionResult = { ok: true; data: Outcome<unknown> } | { ok: false; message: string };

/** Publish / unpublish / archive, reorder and delete for one project. Publish failures list exactly what is missing. */
export function ProjectRowActions({ id, title, version, status, move, afterDelete }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [outcome, setOutcome] = useState<Outcome<unknown> | null>(null);
  const [conflict, setConflict] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const run = (call: () => Promise<ActionResult>, after?: () => void) =>
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
            <Button type="button" size="sm" variant="outline" disabled={pending || move.first} aria-label={`بالاتر بردن ${title}`} onClick={() => run(() => moveProjectAction({ id, direction: "up" }))}>
              ↑
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={pending || move.last} aria-label={`پایین‌تر بردن ${title}`} onClick={() => run(() => moveProjectAction({ id, direction: "down" }))}>
              ↓
            </Button>
          </>
        ) : null}
        {STATUS_BUTTONS[status].map((b) => (
          <Button key={b.to} type="button" size="sm" variant="outline" disabled={pending} onClick={() => run(() => setProjectStatusAction({ id, version, status: b.to }), () => router.refresh())}>
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
        description="این پروژه از فهرست و از سایت برداشته می‌شود."
        confirmLabel="حذف"
        destructive
        pending={pending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() =>
          run(() => deleteProjectAction({ id, version }), () => {
            setConfirmDelete(false);
            if (afterDelete) router.push(afterDelete);
          })
        }
      />
      <ConflictDialog open={conflict} onClose={() => setConflict(false)} onReload={() => router.refresh()} />
    </div>
  );
}
