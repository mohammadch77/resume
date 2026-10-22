/** Persian messages for every media error code the API or actions can return. */
export const MEDIA_ERRORS = {
  empty: "فایل خالی است.",
  unsupported_type: "نوع فایل پشتیبانی نمی‌شود. فقط JPEG، PNG، WebP، AVIF، MP4 و WebM مجاز است.",
  too_large: "حجم فایل بیش از حد مجاز است (تصویر تا ۱۵ مگابایت، ویدیو تا ۱۰۰ مگابایت).",
  corrupt_image: "فایل تصویر خراب است یا خوانده نمی‌شود.",
  video_needs_poster: "برای ویدیو باید یک تصویر پوستر هم انتخاب کنید.",
  bad_request: "درخواست نامعتبر است.",
  unauthenticated: "برای ادامه وارد شوید.",
  forbidden: "اجازه‌ی انجام این کار را ندارید.",
  bad_origin: "درخواست نامعتبر است. صفحه را دوباره بارگذاری کنید.",
  server_error: "ذخیره‌ی فایل انجام نشد. دوباره تلاش کنید.",
  in_use: "این فایل در پروژه، مشتری یا ویدیویی استفاده شده و حذف نمی‌شود. ابتدا آن را از همه‌ی جاها بردارید.",
  not_found: "این فایل پیدا نشد.",
} as const;

export type MediaErrorCode = keyof typeof MEDIA_ERRORS;
