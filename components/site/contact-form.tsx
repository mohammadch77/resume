"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Button, Field, Icon } from "@/components/ds";
import { submitContactAction } from "@/app/(site)/contact/actions";
import { IDLE, type ContactState } from "@/lib/leads/state";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {label}
    </Button>
  );
}

/**
 * Name, phone and message (three fields, outcome-worded button). It is a plain <form action>: without JavaScript the
 * browser posts it and the server renders the result; with JavaScript the same action runs without a page load. The one form
 * is used by the /contact page and by the dialog over the landing, so both give the same result (a lead, the same messages).
 * Validation lives on the server (lib/leads/submit.ts), shown here with the design system's Field error state.
 */
export function ContactForm({ ctaLabel }: { ctaLabel: string }) {
  const [state, action] = useActionState<ContactState, FormData>(submitContactAction, IDLE);
  const startedAt = useRef<HTMLInputElement>(null);
  const sent = useRef<HTMLParagraphElement>(null);

  // When the form appeared, for the minimum-fill-time check. Written to the input directly: no state, no re-render.
  useEffect(() => {
    if (startedAt.current) startedAt.current.value = String(Date.now());
  }, []);

  // The submit button is gone once the request is sent; keep keyboard focus on the confirmation instead of dropping it.
  const isSent = state.status === "sent";
  useEffect(() => {
    if (isSent) sent.current?.focus();
  }, [isSent]);

  if (isSent) {
    return (
      <div className="lk-form">
        <p className="lk-sent" role="status" tabIndex={-1} ref={sent}>
          <Icon name="circle-check" />
          درخواستتان رسید. پس از بررسی با شما تماس می‌گیریم.
        </p>
      </div>
    );
  }

  const errors = state.fieldErrors ?? {};
  const v = state.values;
  return (
    <form className="lk-form" action={action} noValidate>
      <Field label="نام و نام خانوادگی" name="name" autoComplete="name" required defaultValue={v?.name} error={errors.name} />
      <Field label="شماره تماس" name="phone" type="tel" dir="ltr" inputMode="tel" autoComplete="tel" required defaultValue={v?.phone} error={errors.phone} hint={errors.phone ? undefined : "فقط برای هماهنگی جلسه تماس می‌گیریم."} />
      <Field label="درباره‌ی پروژه" name="message" multiline required defaultValue={v?.message} error={errors.message} />
      {/* Honeypot: invisible to people and assistive technology, tempting to bots. Any value = rejected silently. */}
      <div className="gw-visually-hidden" aria-hidden="true">
        <label>
          وب‌سایت
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <input type="hidden" name="ts" ref={startedAt} defaultValue="" />
      {state.status === "error" && state.message && (
        <p className="lk-error" role="alert">
          <Icon name="circle-alert" />
          {state.message}
        </p>
      )}
      <Submit label={ctaLabel} />
      <p className="lk-note">با ارسال این فرم، با تماس ما برای هماهنگی جلسه موافقت می‌کنید.</p>
    </form>
  );
}
