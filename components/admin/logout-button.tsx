"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/app/(admin)/admin/(panel)/actions";

export function LogoutButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await logoutAction({});
          router.replace("/admin/login");
        })
      }
    >
      خروج
    </Button>
  );
}
