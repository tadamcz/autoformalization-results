// data/** -> public/data/**, adding Shiki (github-light, lean4) HTML next to
// every code field the site renders highlighted. Asserts that the tag-stripped,
// entity-decoded HTML equals the input for every block — the highlighted view
// must show exactly the file.
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import { createHighlighter } from "shiki";

const DATA = join(process.cwd(), "data");
const OUT = join(process.cwd(), "public", "data");

const highlighter = await createHighlighter({ themes: ["github-light"], langs: ["lean4"] });

function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

let n = 0;
function highlight(code, where) {
  if (code === null || code === undefined) return undefined;
  const html = highlighter.codeToHtml(code, { lang: "lean4", theme: "github-light" });
  // Shiki: <pre ...><code><span class="line">…</span>\n<span class="line">…</span></code></pre>
  const inner = html.replace(/^<pre[^>]*><code>/, "").replace(/<\/code><\/pre>$/, "");
  const roundTrip = decodeEntities(inner.replace(/<[^>]+>/g, ""));
  if (roundTrip !== code) {
    throw new Error(`highlight round-trip mismatch at ${where}\n--- code\n${code}\n--- got\n${roundTrip}`);
  }
  n += 1;
  return inner;
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, "entries"), { recursive: true });
mkdirSync(join(OUT, "alts"), { recursive: true });

for (const f of ["index.json", "fc_status.json"]) copyFileSync(join(DATA, f), join(OUT, f));

for (const f of readdirSync(join(DATA, "entries")).filter((x) => x.endsWith(".json"))) {
  const entry = JSON.parse(readFileSync(join(DATA, "entries", f), "utf8"));
  for (const b of entry.blocks) {
    if (b.kind !== "decl") continue;
    b.code_html = highlight(b.code, `${entry.id} block ${b.i}`);
    if (b.prefix) b.prefix_html = highlight(b.prefix, `${entry.id} block ${b.i} prefix`);
  }
  writeFileSync(join(OUT, "entries", f), JSON.stringify(entry));
}

for (const f of readdirSync(join(DATA, "alts")).filter((x) => x.endsWith(".json"))) {
  const alts = JSON.parse(readFileSync(join(DATA, "alts", f), "utf8"));
  for (const a of alts.attempts) {
    a.statement_blocks_html = {};
    for (const [slot, code] of Object.entries(a.statement_blocks)) {
      a.statement_blocks_html[slot] = highlight(code, `${alts.id} ${a.cid} ${slot}`);
    }
  }
  writeFileSync(join(OUT, "alts", f), JSON.stringify(alts));
}

console.log(`highlight: ${n} code blocks -> public/data`);
