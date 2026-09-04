// URL query <-> list state, search, sort, and neighbours for ‹ › on the file page.
import type { FcStatus, IndexEntry } from "./schema";

export type Sort = "area" | "title";
export type DefsFilter = "any" | "none" | "some";

export interface ListState {
  q: string;
  source: string | null;
  area: string | null;
  subarea: string | null;
  hideFc: boolean;
  sort: Sort;
  // bounds on the reviewer's confidence and the file length; null = unbounded
  confMin: number | null;
  confMax: number | null;
  linesMin: number | null;
  linesMax: number | null;
  defs: DefsFilter;
}

// everything in the filter row (not source/area, search or sort)
export const NO_FILTERS = {
  confMin: null,
  confMax: null,
  linesMin: null,
  linesMax: null,
  defs: "any" as DefsFilter,
  hideFc: false,
};

export const DEFAULT_STATE: ListState = { q: "", source: null, area: null, subarea: null, sort: "area", ...NO_FILTERS };

// thresholds offered for the length filter (lines); the data's own values are used for confidence
export const LINE_STEPS = [50, 75, 100, 150, 200, 300, 500];

function num(v: string | null): number | null {
  if (v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function parseState(params: URLSearchParams): ListState {
  const defs = params.get("defs");
  return {
    q: params.get("q") ?? "",
    source: params.get("src"),
    area: params.get("area"),
    subarea: params.get("sub"),
    hideFc: params.get("fc") === "hide",
    sort: params.get("sort") === "title" ? "title" : "area",
    confMin: num(params.get("cmin")),
    confMax: num(params.get("cmax")),
    linesMin: num(params.get("lmin")),
    linesMax: num(params.get("lmax")),
    defs: defs === "none" || defs === "some" ? defs : "any",
  };
}

export function serializeState(state: ListState): URLSearchParams {
  const p = new URLSearchParams();
  if (state.q) p.set("q", state.q);
  if (state.source) p.set("src", state.source);
  if (state.area) p.set("area", state.area);
  if (state.subarea) p.set("sub", state.subarea);
  if (state.hideFc) p.set("fc", "hide");
  if (state.sort !== "area") p.set("sort", state.sort);
  if (state.confMin !== null) p.set("cmin", String(state.confMin));
  if (state.confMax !== null) p.set("cmax", String(state.confMax));
  if (state.linesMin !== null) p.set("lmin", String(state.linesMin));
  if (state.linesMax !== null) p.set("lmax", String(state.linesMax));
  if (state.defs !== "any") p.set("defs", state.defs);
  return p;
}

export function hasFilters(state: ListState): boolean {
  return (
    state.confMin !== null ||
    state.confMax !== null ||
    state.linesMin !== null ||
    state.linesMax !== null ||
    state.defs !== "any" ||
    state.hideFc
  );
}

export function distinctConfidences(entries: IndexEntry[]): number[] {
  return [...new Set(entries.map((e) => e.confidence))].sort((a, b) => a - b);
}

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function fold(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

// "Conjecture 1.9" sorts before "Conjecture 1.10"; "Issue 2" before "Issue 10"
export function compareNatural(a: string, b: string): number {
  return fold(a).localeCompare(fold(b), "en", { numeric: true });
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
  if (state.source) out = out.filter((e) => e.source === state.source);
  if (state.area) out = out.filter((e) => e.area === state.area);
  if (state.subarea) out = out.filter((e) => e.subarea === state.subarea);
  if (state.hideFc && fc) out = out.filter((e) => !fc.entries[e.id]);
  const { confMin, confMax, linesMin, linesMax } = state;
  if (confMin !== null) out = out.filter((e) => e.confidence >= confMin);
  if (confMax !== null) out = out.filter((e) => e.confidence <= confMax);
  if (linesMin !== null) out = out.filter((e) => e.lean_lines >= linesMin);
  if (linesMax !== null) out = out.filter((e) => e.lean_lines <= linesMax);
  if (state.defs === "none") out = out.filter((e) => e.counts.defs === 0);
  if (state.defs === "some") out = out.filter((e) => e.counts.defs > 0);
  if (state.q) out = out.filter((e) => matchesQuery(e, state.q));
  if (state.sort === "title") {
    out = [...out].sort((a, b) => compareNatural(a.title, b.title) || a.id.localeCompare(b.id));
  }
  // "by area" is the exporter's order: source, then area, subarea and title
  // with numbers compared as numbers (index.json is written that way)
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
