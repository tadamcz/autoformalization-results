// Validate data/**/*.json against src/data/schema.ts and the cross-file
// invariants the site relies on. Runs first in `pnpm build`.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { Alts, Entry, FcStatus, IndexFile } from "../src/data/schema";

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

const entryIds = ids("entries");
const altIds = ids("alts");
const same = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);
if (!same(indexIds, entryIds)) problems.push("index ids != entries/*.json ids");
if (!same(indexIds, altIds)) problems.push("index ids != alts/*.json ids");

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
  if (e.title !== row.title) problems.push(`${row.id}: title differs between index and entry`);
  if (e.confidence !== row.confidence) problems.push(`${row.id}: confidence differs between index and entry`);
  if (e.lean_lines !== row.lean_lines) problems.push(`${row.id}: lean_lines differs between index and entry`);
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

console.log(`check: ${index.entries.length} entries, ${blocks} blocks`);
if (problems.length) {
  console.error(`check: ${problems.length} problem(s)`);
  for (const p of problems) console.error("  " + p);
  process.exit(1);
}
