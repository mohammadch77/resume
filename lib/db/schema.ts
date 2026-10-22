/**
 * Drizzle mirror of drizzle/migrations/0001_schema.sql. The SQL is the source of truth;
 * tests/db/schema-mirror.test.ts fails if a column name or nullability drifts.
 */
import {
  bigint,
  boolean,
  customType,
  date,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

const citext = customType<{ data: string }>({ dataType: () => "citext" });
const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const userRole = pgEnum("user_role", ["owner", "editor"]);
export const contentStatus = pgEnum("content_status", ["draft", "published", "archived"]);
export const leadStatus = pgEnum("lead_status", ["new", "contacted", "qualified", "won", "lost", "spam"]);
export const mediaKind = pgEnum("media_kind", ["image", "video"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: citext("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  role: userRole("role").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  failedLogins: integer("failed_logins").notNull().default(0),
  lockedUntil: ts("locked_until"),
  lastLoginAt: ts("last_login_at"),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
  deletedAt: ts("deleted_at"),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: ts("expires_at").notNull(),
  absoluteExpiresAt: ts("absolute_expires_at").notNull(),
  ipHash: text("ip_hash"),
  userAgent: text("user_agent"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const mediaAssets = pgTable("media_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: mediaKind("kind").notNull(),
  mime: text("mime").notNull(),
  bytes: bigint("bytes", { mode: "number" }).notNull(),
  width: integer("width"),
  height: integer("height"),
  altFa: text("alt_fa"),
  dominantColor: text("dominant_color"),
  sha256: text("sha256").notNull().unique(),
  originalPath: text("original_path").notNull(),
  variants: jsonb("variants").$type<Record<string, unknown>>().notNull().default({}),
  posterMediaId: uuid("poster_media_id"),
  uploadedBy: uuid("uploaded_by").notNull().references(() => users.id),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const industries = pgTable("industries", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
  deletedAt: ts("deleted_at"),
});

export const techTags = pgTable("tech_tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
  deletedAt: ts("deleted_at"),
});

export const services = pgTable("services", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  iconKey: text("icon_key").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  status: contentStatus("status").notNull().default("draft"),
  version: integer("version").notNull().default(1),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
  deletedAt: ts("deleted_at"),
});

export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  industryId: uuid("industry_id").references(() => industries.id),
  logoMediaId: uuid("logo_media_id").references(() => mediaAssets.id),
  websiteUrl: text("website_url"),
  showNamePublicly: boolean("show_name_publicly").notNull().default(false),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
  deletedAt: ts("deleted_at"),
});

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  clientId: uuid("client_id").references(() => clients.id),
  industryId: uuid("industry_id").notNull().references(() => industries.id),
  summary: text("summary").notNull(),
  challenge: text("challenge").notNull().default(""),
  solution: text("solution").notNull().default(""),
  outcome: text("outcome").notNull().default(""),
  completedOn: date("completed_on"),
  liveUrl: text("live_url"),
  coverMediaId: uuid("cover_media_id").references(() => mediaAssets.id),
  isFeatured: boolean("is_featured").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  status: contentStatus("status").notNull().default("draft"),
  publishedAt: ts("published_at"),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  version: integer("version").notNull().default(1),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
  deletedAt: ts("deleted_at"),
});

export const projectServices = pgTable(
  "project_services",
  {
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.serviceId] })],
);

export const projectTech = pgTable(
  "project_tech",
  {
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    techTagId: uuid("tech_tag_id").notNull().references(() => techTags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.techTagId] })],
);

export const projectMedia = pgTable("project_media", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  mediaId: uuid("media_id").notNull().references(() => mediaAssets.id),
  position: integer("position").notNull(),
  caption: text("caption"),
});

export const projectMetrics = pgTable("project_metrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  valueText: text("value_text").notNull(),
  position: integer("position").notNull(),
});

export const testimonials = pgTable("testimonials", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => clients.id),
  projectId: uuid("project_id").references(() => projects.id),
  authorName: text("author_name").notNull(),
  authorRole: text("author_role"),
  quote: text("quote").notNull(),
  consentConfirmed: boolean("consent_confirmed").notNull().default(false),
  status: contentStatus("status").notNull().default("draft"),
  version: integer("version").notNull().default(1),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
  deletedAt: ts("deleted_at"),
});

export const leads = pgTable("leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: citext("email"),
  company: text("company"),
  message: text("message").notNull(),
  budgetRange: text("budget_range"),
  source: text("source").notNull().default("landing"),
  status: leadStatus("status").notNull().default("new"),
  consent: boolean("consent").notNull(),
  ipHash: text("ip_hash"),
  handledBy: uuid("handled_by").references(() => users.id),
  internalNotes: text("internal_notes"),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const siteSettings = pgTable("site_settings", {
  id: smallint("id").primaryKey(),
  brandName: text("brand_name").notNull(),
  heroTitle: text("hero_title").notNull(),
  heroSubtitle: text("hero_subtitle").notNull(),
  primaryCtaLabel: text("primary_cta_label").notNull(),
  contactPhone: text("contact_phone"),
  contactEmail: citext("contact_email"),
  contactAddress: text("contact_address"),
  socials: jsonb("socials").$type<Record<string, string>>().notNull().default({}),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  version: integer("version").notNull().default(1),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const auditLog = pgTable("audit_log", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  tableName: text("table_name").notNull(),
  rowId: text("row_id").notNull(),
  action: text("action").notNull(),
  beforeData: jsonb("before_data"),
  afterData: jsonb("after_data"),
  actorId: uuid("actor_id"),
  requestId: text("request_id"),
  createdAt: ts("created_at").notNull().defaultNow(),
});
