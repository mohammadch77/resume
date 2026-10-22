import { z } from "zod";
import { optionalHttpsUrl, optionalUuid, requiredText, slugSchema } from "./common";

/** Shared by the client form and saveClientAction. Mirrors the CHECKs on `clients`; "" means "not set". */
export const clientFormSchema = z.object({
  name: requiredText("نام", 120),
  slug: slugSchema,
  industryId: optionalUuid,
  logoMediaId: optionalUuid,
  websiteUrl: optionalHttpsUrl("نشانی وب‌سایت"),
  showNamePublicly: z.boolean(),
});

export type ClientFormValues = z.infer<typeof clientFormSchema>;
