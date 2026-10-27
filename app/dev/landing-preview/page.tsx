import { Landing } from "@/components/site/landing";
import { PREVIEW_DATA } from "@/components/dev/landing-preview-data";

/**
 * The landing with made-up content (no database), to see the layout and the Selected Work strip. It sits under /dev, whose
 * layout answers 404 in production (unless a test run sets ENABLE_DEV_PAGES). The contact dialog is not mounted here.
 */
export default function LandingPreviewPage() {
  return (
    <>
      <p className="gw-t-label bg-sunken px-4 py-2 text-ink-muted" role="note">
        پیش‌نمایش توسعه با داده‌ی ساختگی «نمونه»؛ هیچ‌چیز از این صفحه ذخیره یا منتشر نمی‌شود.
      </p>
      <Landing data={PREVIEW_DATA} preview />
    </>
  );
}
