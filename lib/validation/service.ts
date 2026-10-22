import { z } from "zod";
import { requiredText, SERVICE_ICONS, slugSchema } from "./common";

/** Shared by the service form (client) and saveServiceAction (server). Mirrors the CHECKs on `services`. */
export const serviceFormSchema = z.object({
  title: requiredText("عنوان", 120),
  slug: slugSchema,
  summary: requiredText("توضیح کوتاه", 500),
  iconKey: z.enum(SERVICE_ICONS, "یکی از آیکن‌های فهرست را انتخاب کنید."),
});

export type ServiceFormValues = z.infer<typeof serviceFormSchema>;
