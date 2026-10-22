"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteServiceAction, moveServiceAction, setServiceStatusAction } from "@/app/(admin)/admin/(panel)/services/actions";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { ConflictDialog } from "@/components/admin/conflict-dialog";
import { Button } from "@/components/ui/button";
import type { Outcome } from "@/lib/admin/outcome";
import type { ServiceStatus } from "@/lib/admin/services";

type Props = { id: string; title: string; version: number; status: ServiceStatus; first: boolean; last: boolean };

const STATUS_BUTTONS: Record<ServiceStatus, Array<{ to: ServiceStatus; label: string }>> = {
  draft: [{ to: "published", label: "انتشار" }],
  published: [
    { to: "draft", label: "لغو انتشار" },
    { to: "archived", label: "بایگانی" },
  ],
  archived: [{ to: "draft", label: "بازگرداندن به پیش‌نویس" }],
};

/** Status, reorder and delete controls for one row of the services list. */
export function ServiceRowActions({ id, title, version, status, first, last }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const run = (call: () => Promise<{ ok: true; data: Outcome<unknown> } | { ok: false; message: string }>, after?: () => void) =>
    start(async () => {
      const r = await call();
      const outcome = r.ok ? r.data : null;
      if (!r.ok) setMessage(r.message);
      else if (outcome?.kind === "conflict") setConflict(true);
      else if (outcome?.kind === "failed") setMessage(outcome.message);
      else if (outcome?.kind === "blocked") setMessage(outcome.reasons.join(" "));
      else {
        setMessage(null);
        after?.();
      }
    });

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" size="sm" variant="outline" disabled={pending || first} aria-label={`بالاتر بردن ${title}`} onClick={() => run(() => moveServiceAction({ id, direction: "up" }))}>
          ↑
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={pending || last} aria-label={`پایین‌تر بردن ${title}`} onClick={() => run(() => moveServiceAction({ id, direction: "down" }))}>
          ↓
        </Button>
        {STATUS_BUTTONS[status].map((b) => (
          <Button key={b.to} type="button" size="sm" variant="outline" disabled={pending} onClick={() => run(() => setServiceStatusAction({ id, version, status: b.to }))}>
            {b.label}
          </Button>
        ))}
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => setConfirmDelete(true)}>
          حذف
        </Button>
      </div>
      {message ? (
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      ) : null}
      <ConfirmDialog
        open={confirmDelete}
        title={`حذف «${title}»؟`}
        description="این خدمت از فهرست برداشته می‌شود."
        confirmLabel="حذف"
        destructive
        pending={pending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => run(() => deleteServiceAction({ id, version }), () => setConfirmDelete(false))}
      />
      <ConflictDialog open={conflict} onClose={() => setConflict(false)} onReload={() => router.refresh()} />
    </div>
  );
}
