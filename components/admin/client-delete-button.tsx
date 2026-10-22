"use client";

import { useState, useTransition } from "react";
import { deleteClientAction } from "@/app/(admin)/admin/(panel)/clients/actions";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";

export function ClientDeleteButton({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const confirm = () =>
    start(async () => {
      const r = await deleteClientAction({ id });
      const error = !r.ok ? r.message : r.data.kind === "failed" ? r.data.message : null;
      setMessage(error);
      if (!error) setOpen(false);
    });

  return (
    <>
      <Button type="button" size="sm" variant="outline" onClick={() => { setMessage(null); setOpen(true); }}>
        حذف
      </Button>
      <ConfirmDialog
        open={open}
        title={`حذف «${name}»؟`}
        description={message ?? "این مشتری از فهرست برداشته می‌شود."}
        confirmLabel="حذف"
        destructive
        pending={pending}
        onConfirm={confirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
