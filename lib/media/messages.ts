import { IMAGE_MAX_BYTES, VIDEO_MAX_BYTES, megabytesFa } from "./config";

/** Persian messages for every media error code the API or actions can return. */
export const MEDIA_ERRORS = {
  empty: "فایل خالی است.",
  unsupported_type: "نوع فایل پشتیبانی نمی‌شود. فقط JPEG، PNG، WebP، AVIF، MP4 و WebM مجاز است.",
  too_large: `حجم فایل بیش از حد مجاز است (تصویر تا ${megabytesFa(IMAGE_MAX_BYTES)} مگابایت، ویدیو تا ${megabytesFa(VIDEO_MAX_BYTES)} مگابایت).`,
  corrupt_image: "فایل تصویر خراب است یا خوانده نمی‌شود.",
  video_needs_poster: "برای ویدیو باید یک تصویر پوستر هم انتخاب کنید.",
  bad_request: "درخواست نامعتبر است.",
  unauthenticated: "برای ادامه وارد شوید.",
  forbidden: "اجازه‌ی انجام این کار را ندارید.",
  bad_origin: "درخواست نامعتبر است. صفحه را دوباره بارگذاری کنید.",
  server_error: "ذخیره‌ی فایل انجام نشد. دوباره تلاش کنید.",
  proxy_too_large: "حجم فایل از حد مجاز سرور بیشتر است. فایل کوچک‌تری انتخاب کنید یا به مدیر سرور بگویید حد حجم را بالا ببرد.",
  network_error: "ارتباط با سرور قطع شد. اتصال اینترنت را بررسی کنید و دوباره تلاش کنید.",
  in_use: "این فایل در پروژه، مشتری یا ویدیویی استفاده شده و حذف نمی‌شود. ابتدا آن را از همه‌ی جاها بردارید.",
  not_found: "این فایل پیدا نشد.",
} as const;

export type MediaErrorCode = keyof typeof MEDIA_ERRORS;

/**
 * The code to show when the upload endpoint answered with something that is not our JSON (a reverse proxy error
 * page, a dropped connection). Without this every such failure reads as a generic server error.
 */
export function codeFromHttpFailure(status: number): MediaErrorCode {
  if (status === 0) return "network_error";
  if (status === 413) return "proxy_too_large";
  if (status === 401) return "unauthenticated";
  if (status === 403) return "bad_origin";
  return "server_error";
}
