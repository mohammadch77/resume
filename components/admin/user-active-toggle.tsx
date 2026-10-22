"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setUserActiveAction } from "@/app/(admin)/admin/(panel)/users/actions";

export function UserActiveToggle({ userId, active }: { userId: string; active: boolean }) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() => start(async () => void (await setUserActiveAction({ userId, active: !active })))}
    >
      {active ? "غیرفعال‌کردن" : "فعال‌کردن"}
    </Button>
  );
}
