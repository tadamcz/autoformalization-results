// Fetch + cache of the exporter's JSON. data/ is Vite's public directory, so
// the committed files are served as-is at the site root.
import { useEffect, useState } from "react";
import { setKatexMacros } from "../components/MathText";
import type { Alts, Entry, FcStatus, IndexFile, SharedDefs } from "./schema";

const cache = new Map<string, Promise<unknown>>();

function url(rel: string): string {
  return `${import.meta.env.BASE_URL}${rel}`;
}

function fetchJson<T>(rel: string): Promise<T> {
  let p = cache.get(rel);
  if (!p) {
    p = fetch(url(rel)).then((r) => {
      if (!r.ok) throw new Error(`${rel}: HTTP ${r.status}`);
      return r.json();
    });
    p.catch(() => cache.delete(rel));
    cache.set(rel, p);
  }
  return p as Promise<T>;
}

export const loadIndex = () =>
  fetchJson<IndexFile>("index.json").then((index) => {
    // the sources' TeX macros for KaTeX (kourovka) — set once, before any statement renders
    const macros: Record<string, string> = {};
    for (const s of Object.values(index.meta.sources)) Object.assign(macros, s.katex_macros ?? {});
    setKatexMacros(macros);
    return index;
  });
export const loadEntry = (id: string) => fetchJson<Entry>(`entries/${encodeURIComponent(id)}.json`);
export const loadAlts = (id: string) => fetchJson<Alts>(`alts/${encodeURIComponent(id)}.json`);
export const loadFcStatus = () => fetchJson<FcStatus>("fc_status.json");
export const loadSharedDefs = () => fetchJson<SharedDefs>("shared_defs.json");

export type Loaded<T> =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "ok"; data: T };

export function useLoaded<T>(loader: (() => Promise<T>) | null, key: string): Loaded<T> {
  const [state, setState] = useState<Loaded<T>>({ status: "loading" });
  useEffect(() => {
    if (!loader) return;
    let live = true;
    setState({ status: "loading" });
    loader().then(
      (data) => live && setState({ status: "ok", data }),
      (e: unknown) => live && setState({ status: "error", error: String(e) }),
    );
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state;
}

export function useIndex(): Loaded<IndexFile> {
  return useLoaded(loadIndex, "index");
}

export function useEntry(id: string | undefined): Loaded<Entry> {
  return useLoaded(id ? () => loadEntry(id) : null, `entry:${id}`);
}

export function useAlts(id: string | undefined, enabled: boolean): Loaded<Alts> {
  return useLoaded(id && enabled ? () => loadAlts(id) : null, `alts:${id}:${enabled}`);
}

export function useFcStatus(): Loaded<FcStatus> {
  return useLoaded(loadFcStatus, "fc");
}

export function useSharedDefs(): Loaded<SharedDefs> {
  return useLoaded(loadSharedDefs, "shared-defs");
}
