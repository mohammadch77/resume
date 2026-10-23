import { z } from "zod";
import { optionalText, optionalUuid, requiredText } from "./common";

/** Shared by the testimonial form and saveTestimonialAction. Mirrors the CHECKs on `testimonials`. */
export const testimonialFormSchema = z.object({
  clientId: z.uuid("مشتری را انتخاب کنید."),
  projectId: optionalUuid,
  authorName: requiredText("نام گوینده", 80),
  authorRole: optionalText("سمت", 80),
  quote: z.string().trim().min(10, "متن نظر دست‌کم ۱۰ حرف باشد.").max(600, "متن نظر حداکثر ۶۰۰ حرف باشد."),
  consentConfirmed: z.boolean(),
});

export type TestimonialFormValues = z.infer<typeof testimonialFormSchema>;
