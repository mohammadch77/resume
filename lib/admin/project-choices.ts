import { asc, isNull } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { clients, services } from "@/lib/db/schema";
import { listPickerOptions, type PickerOption } from "@/lib/media/picker";
import { listTaxonomy } from "./taxonomy";

export type ProjectFormChoices = {
  industries: Array<{ id: string; name: string }>;
  clients: Array<{ id: string; name: string }>;
  services: Array<{ id: string; name: string }>;
  techTags: Array<{ id: string; name: string }>;
  images: PickerOption[];
  gallery: PickerOption[];
};

/** Everything the project form offers as a choice, loaded once per page. */
export async function loadProjectFormChoices(db: Db): Promise<ProjectFormChoices> {
  const [industries, techTags, clientRows, serviceRows, gallery] = await Promise.all([
    listTaxonomy(db, "industry"),
    listTaxonomy(db, "tech"),
    db.select({ id: clients.id, name: clients.name }).from(clients).where(isNull(clients.deletedAt)).orderBy(asc(clients.name)),
    db.select({ id: services.id, name: services.title }).from(services).where(isNull(services.deletedAt)).orderBy(asc(services.sortOrder)),
    listPickerOptions(db, ["image", "video"]),
  ]);
  return {
    industries: industries.map(({ id, name }) => ({ id, name })),
    techTags: techTags.map(({ id, name }) => ({ id, name })),
    clients: clientRows,
    services: serviceRows,
    images: gallery.filter((o) => o.kind === "image"),
    gallery,
  };
}
