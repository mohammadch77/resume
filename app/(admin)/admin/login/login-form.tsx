"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction, type LoginState } from "./actions";

const initial: LoginState = { error: null };

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initial);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">ایمیل</Label>
        <Input id="email" name="email" type="email" autoComplete="username" required dir="ltr" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">رمز عبور</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required dir="ltr" />
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "در حال ورود…" : "ورود به پنل"}
      </Button>
    </form>
  );
}
