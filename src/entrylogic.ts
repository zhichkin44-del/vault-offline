import type { Entry, EntryType } from "./types";

export type TypeFilter = "all" | EntryType;
export type SortBy = "updated" | "title";
export type Category = "all" | "login" | "note" | "custom";

export function categoryToFilter(cat: Category): TypeFilter {
  return cat;
}

export function countByCategory(entries: Entry[]): Record<Category, number> {
  const counts: Record<Category, number> = {
    all: entries.length,
    login: 0,
    note: 0,
    custom: 0,
  };
  for (const e of entries) {
    if (e.type === "login") counts.login++;
    else if (e.type === "note") counts.note++;
    else if (e.type === "custom") counts.custom++;
  }
  return counts;
}

export function matchesQuery(e: Entry, q: string): boolean {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  const hay = [
    e.title,
    e.login,
    e.url,
    e.note,
    ...e.fields.map((f) => `${f.k} ${f.v}`),
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(s);
}

export function filterEntries(
  entries: Entry[],
  query: string,
  type: TypeFilter,
): Entry[] {
  return entries.filter(
    (e) => (type === "all" || e.type === type) && matchesQuery(e, query),
  );
}

export function sortEntries(entries: Entry[], by: SortBy): Entry[] {
  const copy = [...entries];
  if (by === "title") copy.sort((a, b) => a.title.localeCompare(b.title));
  else copy.sort((a, b) => b.updated - a.updated);
  return copy;
}

export interface ValidationErrors {
  title?: string;
}

export function validateEntry(e: Partial<Entry>): ValidationErrors {
  const errs: ValidationErrors = {};
  if (!e.title || e.title.trim().length === 0) errs.title = "required";
  return errs;
}
