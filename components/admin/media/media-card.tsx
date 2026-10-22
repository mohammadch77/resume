"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteMediaAction, updateAltAction } from "@/app/(admin)/admin/(panel)/media/actions";
import { MEDIA_ERRORS } from "@/lib/media/messages";

export type MediaCardData = {
  id: string;
  kind: "image" | "video";
  altFa: string | null;
  usageCount: number;
  bytes: number;
  width: number | null;
  height: number | null;
};

const formatBytes = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toLocaleString("fa-IR", { maximumFractionDigits: 1 })} مگابایت` : `${Math.round(n / 1024).toLocaleString("fa-IR")} کیلوبایت`);

export function MediaCard({ asset, preview }: { asset: MediaCardData; preview: React.ReactNode }) {
  const [alt, setAlt] = useState(asset.altFa ?? "");
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const inputId = `alt-${asset.id}`;

  const saveAlt = () =>
    start(async () => {
      const r = await updateAltAction({ id: asset.id, alt });
      setMessage(r.ok ? { tone: "ok", text: "ذخیره شد." } : { tone: "error", text: r.fieldErrors?.alt?.[0] ?? r.message });
    });

  const remove = () => {
    if (!window.confirm("این فایل برای همیشه حذف شود؟")) return;
    start(async () => {
      const r = await deleteMediaAction({ id: asset.id });
      if (!r.ok) setMessage({ tone: "error", text: r.message });
      else if (!r.data.deleted) setMessage({ tone: "error", text: MEDIA_ERRORS[r.data.code] });
    });
  };

  return (
    <li className="flex flex-col gap-3 rounded-lg border p-3" data-testid="media-card">
      <div className="aspect-4/3 overflow-hidden rounded-md bg-muted">{preview}</div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="secondary">{asset.kind === "video" ? "ویدیو" : "تصویر"}</Badge>
        <span>{formatBytes(asset.bytes)}</span>
        {asset.width && asset.height ? (
          <span dir="ltr">
            {asset.width}×{asset.height}
          </span>
        ) : null}
        <span>{asset.usageCount > 0 ? `در ${asset.usageCount.toLocaleString("fa-IR")} جا استفاده شده` : "استفاده نشده"}</span>
      </div>
      {!asset.altFa ? <Badge variant="outline">متن جایگزین ندارد؛ برای انتشار لازم است</Badge> : null}
      <div className="flex flex-col gap-2">
        <Label htmlFor={inputId}>متن جایگزین (فارسی)</Label>
        <Input id={inputId} value={alt} onChange={(e) => setAlt(e.target.value)} maxLength={300} />
        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={saveAlt} disabled={pending}>
            ذخیره
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={remove} disabled={pending}>
            حذف
          </Button>
        </div>
        {message ? (
          <p role={message.tone === "error" ? "alert" : "status"} className={message.tone === "error" ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
            {message.text}
          </p>
        ) : null}
      </div>
    </li>
  );
}
