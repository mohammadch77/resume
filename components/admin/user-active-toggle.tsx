"use client";

import { useState, useTransition } from "react";
import { setUserActiveAction } from "@/app/(admin)/admin/(panel)/users/actions";
import { Button } from "@/components/ui/button";

export function UserActiveToggle({ userId, active }: { userId: string; active: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await setUserActiveAction({ userId, active: !active });
            setError(!r.ok ? r.message : r.data.kind === "failed" ? r.data.message : null);
          })
        }
      >
        {active ? "غیرفعال‌کردن" : "فعال‌کردن"}
      </Button>
      {error ? (
        <span role="alert" className="text-sm text-destructive">
          {error}
        </span>
      ) : null}
    </>
  );
}
