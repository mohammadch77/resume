export const PAGE_SIZE = 25;

export type PageInfo = { page: number; pageSize: number; offset: number };

/** Parses `?page=3` defensively (anything odd becomes page 1). */
export function parsePage(value: string | string[] | undefined, pageSize = PAGE_SIZE): PageInfo {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = Number(raw);
  const page = Number.isInteger(n) && n >= 1 && n <= 10_000 ? n : 1;
  return { page, pageSize, offset: (page - 1) * pageSize };
}

export const totalPages = (total: number, pageSize = PAGE_SIZE): number => Math.max(1, Math.ceil(total / pageSize));
