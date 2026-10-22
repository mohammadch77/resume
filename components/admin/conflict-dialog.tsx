"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Props = { open: boolean; onClose: () => void; onReload: () => void };

/**
 * Shown when another editor saved first. There is deliberately no "overwrite" button:
 * the editor either loads the newer version or stays on the page to copy their text out first.
 */
export function ConflictDialog({ open, onClose, onReload }: Props) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>این مورد همزمان تغییر کرده است</DialogTitle>
          <DialogDescription>
            شخص دیگری پیش از شما همین مورد را ذخیره کرده است. تغییرات شما ذخیره نشد تا کار او از بین نرود. نسخه‌ی جدید را بارگذاری کنید و تغییرات‌تان را دوباره اعمال کنید.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            ماندن در صفحه (برای کپی متن)
          </Button>
          <Button type="button" onClick={onReload}>
            بارگذاری نسخه‌ی جدید
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
