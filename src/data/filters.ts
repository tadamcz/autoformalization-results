// URL query <-> list state, search, sort, and neighbours for ‹ › on the file page.
import type { FcStatus, IndexEntry } from "./schema";

export type Sort = "area" | "title";

export interface ListState {
  q: string;
  area: string | null;
  subarea: string | null;
  hideFc: boolean;
  sort: Sort;
}

export const DEFAULT_STATE: ListState = { q: "", area: null, subarea: null, hideFc: false, sort: "area" };

export function parseState(params: URLSearchParams): ListState {
  return {
    q: params.get("q") ?? "",
    area: params.get("area"),
    subarea: params.get("sub"),
    hideFc: params.get("fc") === "hide",
    sort: params.get("sort") === "title" ? "title" : "area",
  };
}

export function serializeState(state: ListState): URLSearchParams {
  const p = new URLSearchParams();
  if (state.q) p.set("q", state.q);
  if (state.area) p.set("area", state.area);
  if (state.subarea) p.set("sub", state.subarea);
  if (state.hideFc) p.set("fc", "hide");
  if (state.sort !== "area") p.set("sort", state.sort);
  return p;
}

export function fold(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function matchesQuery(entry: IndexEntry, q: string): boolean {
  const terms = fold(q).split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  return terms.every((t) => entry.search.includes(t));
}

export function applyFilters(
  entries: IndexEntry[],
  state: ListState,
  fc: FcStatus | null,
): IndexEntry[] {
  let out = entries;
  if (state.area) out = out.filter((e) => e.area === state.area);
  if (state.subarea) out = out.filter((e) => e.subarea === state.subarea);
  if (state.hideFc && fc) out = out.filter((e) => !fc.entries[e.id]);
  if (state.q) out = out.filter((e) => matchesQuery(e, state.q));
  const byTitle = (a: IndexEntry, b: IndexEntry) => fold(a.title).localeCompare(fold(b.title)) || a.id.localeCompare(b.id);
  if (state.sort === "title") {
    out = [...out].sort(byTitle);
  } else {
    out = [...out].sort(
      (a, b) =>
        a.area.localeCompare(b.area) ||
        (a.subarea ?? "").localeCompare(b.subarea ?? "") ||
        byTitle(a, b),
    );
  }
  return out;
}

export function neighbours(ids: string[], id: string): { prev: string | null; next: string | null } {
  const i = ids.indexOf(id);
  if (i === -1) return { prev: null, next: null };
  return { prev: i > 0 ? ids[i - 1] : null, next: i + 1 < ids.length ? ids[i + 1] : null };
}

export function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}
