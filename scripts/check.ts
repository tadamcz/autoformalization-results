// Validate data/**/*.json against src/data/schema.ts and the cross-file
// invariants the site relies on. Runs first in `pnpm build`.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { Alts, Entry, FcStatus, IndexFile, SharedDefs } from "../src/data/schema";

const DATA = join(process.cwd(), "data");
const problems: string[] = [];

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

function ids(dir: string): string[] {
  return readdirSync(join(DATA, dir))
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.slice(0, -5))
    .sort();
}

const index = IndexFile.parse(readJson(join(DATA, "index.json")));
const indexIds = index.entries.map((e) => e.id).sort();
if (new Set(indexIds).size !== indexIds.length) problems.push("duplicate ids in index.json");
if (index.meta.n_entries !== index.entries.length) problems.push("meta.n_entries != entries.length");

// per-source metadata agrees with the rows
const sources = index.meta.sources;
for (const row of index.entries) {
  if (!sources[row.source]) problems.push(`${row.id}: source ${row.source} not in meta.sources`);
}
for (const [key, s] of Object.entries(sources)) {
  const rows = index.entries.filter((e) => e.source === key);
  if (s.n_entries !== rows.length) problems.push(`meta.sources.${key}.n_entries=${s.n_entries} but ${rows.length} rows`);
  const areas: Record<string, { count: number; subareas: Record<string, number> }> = {};
  for (const e of rows) {
    const a = (areas[e.area] ??= { count: 0, subareas: {} });
    a.count += 1;
    if (e.subarea) a.subareas[e.subarea] = (a.subareas[e.subarea] ?? 0) + 1;
  }
  const norm = (x: unknown) => JSON.stringify(x, Object.keys(x as object).sort());
  for (const [name, info] of Object.entries(s.areas)) {
    if (!areas[name]) problems.push(`meta.sources.${key}.areas has ${name} with no rows`);
    else if (info.count !== areas[name].count || norm(info.subareas) !== norm(areas[name].subareas))
      problems.push(`meta.sources.${key}.areas.${name} disagrees with the rows`);
  }
  for (const name of Object.keys(areas)) if (!s.areas[name]) problems.push(`meta.sources.${key}.areas lacks ${name}`);
  if (s.run.outcomes.shown !== rows.length) problems.push(`meta.sources.${key}.run.outcomes.shown != rows`);
}
const orders = Object.values(sources).map((s) => s.order);
if (new Set(orders).size !== orders.length) problems.push("meta.sources orders are not distinct");

const entryIds = ids("entries");
const altIds = ids("alts");
const same = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);
if (!same(indexIds, entryIds)) problems.push("index ids != entries/*.json ids");
if (!same(indexIds, altIds)) problems.push("index ids != alts/*.json ids");

// for shared_defs.json: each entry's definition blocks by index
const defBlocks = new Map<string, Map<number, string | null>>();
let blocks = 0;
for (const row of index.entries) {
  const path = join(DATA, "entries", `${row.id}.json`);
  const parsed = Entry.safeParse(readJson(path));
  if (!parsed.success) {
    problems.push(`${row.id}: ${parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
    continue;
  }
  const e = parsed.data;
  if (e.id !== row.id) problems.push(`${row.id}: id mismatch`);
  if (e.source !== row.source) problems.push(`${row.id}: source differs between index and entry`);
  if (e.title !== row.title) problems.push(`${row.id}: title differs between index and entry`);
  if (e.confidence !== row.confidence) problems.push(`${row.id}: confidence differs between index and entry`);
  if (e.lean_lines !== row.lean_lines) problems.push(`${row.id}: lean_lines differs between index and entry`);
  if (e.area !== row.area || e.subarea !== row.subarea) problems.push(`${row.id}: area differs between index and entry`);
  const src = sources[e.source];
  if (src && e.run_id !== src.run.run_id) problems.push(`${row.id}: run_id ${e.run_id} is not the source's run ${src.run.run_id}`);
  if ((e.source === "kourovka") !== (e.source_ref !== null)) problems.push(`${row.id}: source_ref must be set exactly for kourovka entries`);
  if ((e.source === "kourovka") !== (e.statement_tex !== null)) problems.push(`${row.id}: statement_tex must be set exactly for kourovka entries`);
  if (e.source_ref && e.id !== `kourovka-${e.source_ref.number}`) problems.push(`${row.id}: source_ref.number does not match the id`);
  if (e.checks.probe.budget_minutes === null && e.checks.probe.budget_messages === null) problems.push(`${row.id}: probe has no budget`);
  const nl = e.lean.split("\n").length - (e.lean.endsWith("\n") || e.lean === "" ? 1 : 0);
  if (e.lean_lines !== nl) problems.push(`${row.id}: lean_lines=${e.lean_lines} but the file has ${nl} lines`);
  if (e.confidence < index.meta.min_confidence) problems.push(`${row.id}: confidence ${e.confidence} below meta.min_confidence`);
  if (e.statement_segments.map((s) => s.text).join("") !== e.statement)
    problems.push(`${row.id}: statement_segments do not concatenate to statement`);
  if (e.blocks.map((b) => b.text).join("") !== e.lean)
    problems.push(`${row.id}: blocks do not concatenate to lean`);
  e.blocks.forEach((b, i) => {
    blocks += 1;
    if (b.i !== i) problems.push(`${row.id}: block ${i} has i=${b.i}`);
  });
  defBlocks.set(e.id, new Map(e.blocks.filter((b) => b.role === "definition").map((b) => [b.i, b.fq_name ?? null])));
  for (const c of e.claims) {
    if (c.kind === "stated") {
      const b = c.block === null ? undefined : e.blocks[c.block];
      if (!b || b.kind !== "decl" || b.role !== "statement" || b.claim !== c.position)
        problems.push(`${row.id}: claim ${c.position} does not point at a statement block`);
    } else if (c.block !== null) {
      problems.push(`${row.id}: ${c.kind} claim ${c.position} has a block`);
    }
    if (c.location.location === "statement") {
      const { start, end } = c.location;
      if (start === null || end === null || start < 0 || end > e.statement.length || start >= end)
        problems.push(`${row.id}: claim ${c.position} has bad statement offsets`);
    }
  }
  const stated = e.claims.filter((c) => c.kind === "stated").length;
  if (stated !== e.outcome.statements_kept) problems.push(`${row.id}: stated claims != statements_kept`);
  for (const b of e.blocks) {
    for (const u of [...(b.uses ?? []), ...(b.used_by ?? [])]) {
      if (!e.blocks[u] || e.blocks[u].kind !== "decl") problems.push(`${row.id}: block ${b.i} references non-decl ${u}`);
    }
  }
  const alts = Alts.safeParse(readJson(join(DATA, "alts", `${row.id}.json`)));
  if (!alts.success) {
    problems.push(`${row.id} alts: ${alts.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  } else {
    if (JSON.stringify(alts.data.chosen) !== JSON.stringify(e.attempts.chosen))
      problems.push(`${row.id}: alts.chosen != entry.attempts.chosen`);
    if (alts.data.attempts.length !== e.attempts.total) problems.push(`${row.id}: alts attempt count`);
  }
}

const fcPath = join(DATA, "fc_status.json");
if (existsSync(fcPath)) {
  const fc = FcStatus.parse(readJson(fcPath));
  if (fc.pin !== index.meta.fc.commit) problems.push("fc_status.pin != meta.fc.commit");
  for (const id of Object.keys(fc.entries)) {
    if (!indexIds.includes(id)) problems.push(`fc_status names unknown entry ${id}`);
  }
} else {
  problems.push("data/fc_status.json missing");
}

// shared_defs.json is optional; when present, every member must be a definition
// block of a shown entry (the pages deep-link to it) and the groups must be sound
const sdPath = join(DATA, "shared_defs.json");
let nSharedGroups = 0;
if (existsSync(sdPath)) {
  const sd = SharedDefs.parse(readJson(sdPath));
  nSharedGroups = sd.groups.length;
  const gids = sd.groups.map((g) => g.id);
  if (new Set(gids).size !== gids.length) problems.push("shared_defs: duplicate group ids");
  const seen = new Set<string>();
  for (const g of sd.groups) {
    const files = new Set(g.members.map((m) => m.entry_id));
    if (files.size !== g.n_files) problems.push(`shared_defs ${g.id}: n_files=${g.n_files} but ${files.size} entries`);
    if (g.n_files < sd.min_files) problems.push(`shared_defs ${g.id}: fewer than min_files entries`);
    const reps = g.members.filter((m) => m.relation === "representative").length;
    if (g.adjudicated ? reps !== 1 : reps !== 0) problems.push(`shared_defs ${g.id}: ${reps} representatives (adjudicated=${g.adjudicated})`);
    const counts: Record<string, number> = {};
    for (const m of g.members) {
      if (seen.has(m.def_id)) problems.push(`shared_defs: ${m.def_id} in two groups`);
      seen.add(m.def_id);
      if (!sources[m.source]) problems.push(`shared_defs ${g.id}: unknown source ${m.source}`);
      if (!g.sources.includes(m.source)) problems.push(`shared_defs ${g.id}: member source ${m.source} not in group sources`);
      const defs = defBlocks.get(m.entry_id);
      if (!defs) problems.push(`shared_defs ${g.id}: ${m.entry_id} is not a shown entry`);
      else if (!defs.has(m.block) || defs.get(m.block) !== m.fq_name) problems.push(`shared_defs ${g.id}: ${m.def_id} is not definition block ${m.block} of ${m.entry_id}`);
      for (const u of m.uses) {
        if (defs && (!defs.has(u.block) || defs.get(u.block) !== u.fq_name)) problems.push(`shared_defs ${g.id}: ${m.def_id} uses a non-definition block ${u.block}`);
      }
      if (g.adjudicated !== (m.relation !== null)) problems.push(`shared_defs ${g.id}: ${m.def_id} relation does not match adjudicated`);
      if (m.relation && m.relation !== "representative") counts[m.relation] = (counts[m.relation] ?? 0) + 1;
    }
    for (const [k, n] of Object.entries(g.verdicts)) if ((counts[k] ?? 0) !== n) problems.push(`shared_defs ${g.id}: verdicts.${k}=${n} but ${counts[k] ?? 0} members`);
  }
}

console.log(`check: ${index.entries.length} entries (${Object.entries(sources).map(([k, s]) => `${k} ${s.n_entries}`).join(", ")}), ${blocks} blocks, ${nSharedGroups} shared-definition groups`);
if (problems.length) {
  console.error(`check: ${problems.length} problem(s)`);
  for (const p of problems) console.error("  " + p);
  process.exit(1);
}
