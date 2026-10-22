"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IMAGE_MAX_BYTES, VIDEO_MAX_BYTES, megabytesFa } from "@/lib/media/config";
import { MEDIA_ERRORS, type MediaErrorCode } from "@/lib/media/messages";

type Item = { name: string; progress: number; state: "uploading" | "done" | "duplicate" | "error"; message?: string };

function upload(form: FormData, onProgress: (pct: number) => void): Promise<{ status: number; body: { ok: boolean; code?: MediaErrorCode; deduped?: boolean } }> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/admin/api/media");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      let body: { ok: boolean; code?: MediaErrorCode; deduped?: boolean };
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        body = { ok: false, code: "server_error" };
      }
      resolve({ status: xhr.status, body });
    };
    xhr.onerror = () => resolve({ status: 0, body: { ok: false, code: "server_error" } });
    xhr.send(form);
  });
}

export function MediaUploader() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const imageInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const posterInput = useRef<HTMLInputElement>(null);

  const patch = (index: number, change: Partial<Item>) =>
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...change } : it)));

  async function send(files: Array<{ name: string; form: FormData }>) {
    const base = items.length;
    setItems((prev) => [...prev, ...files.map((f) => ({ name: f.name, progress: 0, state: "uploading" as const }))]);
    await Promise.all(
      files.map(async (f, i) => {
        const { body } = await upload(f.form, (pct) => patch(base + i, { progress: pct }));
        if (body.ok) patch(base + i, { progress: 100, state: body.deduped ? "duplicate" : "done" });
        else patch(base + i, { state: "error", message: MEDIA_ERRORS[body.code ?? "server_error"] });
      }),
    );
    router.refresh();
  }

  async function onImages(files: FileList | null) {
    if (!files || files.length === 0) return;
    await send(
      [...files].map((file) => {
        const form = new FormData();
        form.set("file", file);
        return { name: file.name, form };
      }),
    );
    if (imageInput.current) imageInput.current.value = "";
  }

  async function onVideo() {
    const video = videoInput.current?.files?.[0];
    const poster = posterInput.current?.files?.[0];
    if (!video) return;
    const form = new FormData();
    form.set("file", video);
    if (poster) form.set("poster", poster);
    await send([{ name: video.name, form }]);
    if (videoInput.current) videoInput.current.value = "";
    if (posterInput.current) posterInput.current.value = "";
  }

  return (
    <section aria-labelledby="upload-title" className="flex flex-col gap-4 rounded-lg border p-4">
      <h2 id="upload-title" className="text-lg font-semibold">
        بارگذاری فایل
      </h2>
      <div className="flex flex-col gap-2">
        <Label htmlFor="images">{`تصویر (JPEG، PNG، WebP، AVIF — تا ${megabytesFa(IMAGE_MAX_BYTES)} مگابایت)`}</Label>
        <Input id="images" ref={imageInput} type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" onChange={(e) => onImages(e.target.files)} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="video">{`ویدیو (MP4 یا WebM — تا ${megabytesFa(VIDEO_MAX_BYTES)} مگابایت). فقط در گالری پروژه به کار می‌رود، نه به‌عنوان کاور یا در بالای صفحه.`}</Label>
        <Input id="video" ref={videoInput} type="file" accept="video/mp4,video/webm" />
        <Label htmlFor="poster">تصویر پوستر ویدیو (الزامی)</Label>
        <Input id="poster" ref={posterInput} type="file" accept="image/jpeg,image/png,image/webp,image/avif" />
        <Button type="button" variant="outline" onClick={onVideo} className="self-start">
          بارگذاری ویدیو
        </Button>
      </div>
      {items.length > 0 ? (
        <ul className="flex flex-col gap-2" aria-live="polite">
          {items.map((it, i) => (
            <li key={`${it.name}-${i}`} className="flex flex-col gap-1 text-sm">
              <span dir="ltr" className="truncate text-start">
                {it.name}
              </span>
              {it.state === "uploading" ? (
                <progress value={it.progress} max={100} aria-label={`پیشرفت بارگذاری ${it.name}`} className="w-full" />
              ) : it.state === "error" ? (
                <span role="alert" className="text-destructive">
                  {it.message}
                </span>
              ) : (
                <span className="text-muted-foreground">{it.state === "duplicate" ? "این فایل از قبل در کتابخانه بود." : "بارگذاری شد."}</span>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
