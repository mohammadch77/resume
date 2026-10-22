import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\//, "DATABASE_URL must be a postgres URL"),
  MIGRATOR_DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\//).optional(),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  SITE_URL: z.url(),
  UPLOADS_DIR: z.string().min(1).default("./uploads"),
  TRUST_PROXY: z.enum(["true", "false"]).default("false"),
  LOGIN_RATE_LIMIT_PER_MIN: z.coerce.number().int().positive().default(20),
  OWNER_EMAIL: z.email().optional(),
  OWNER_PASSWORD: z.string().min(12).optional(),
  TELEGRAM_BOT_TOKEN: z.string().min(1).optional(),
  TELEGRAM_CHAT_ID: z.string().min(1).optional(),
  BALE_BOT_TOKEN: z.string().min(1).optional(),
  BALE_CHAT_ID: z.string().min(1).optional(),
});

export type Env = z.infer<typeof schema>;

function load(): Env {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment:\n${issues}`);
  }
  return parsed.data;
}

let cached: Env | undefined;

/** Validated env. Throws on first access if invalid, so the app refuses to boot. */
export function env(): Env {
  cached ??= load();
  return cached;
}
