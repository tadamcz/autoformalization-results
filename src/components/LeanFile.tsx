import { useEffect, useMemo, useState } from "react";
import type { Alts, Block, Claim, Entry } from "../data/schema";
import { CategoryChip } from "./CategoryChip";
import { Code } from "./Code";
import { Disclosure } from "./Disclosure";
import { Markdown } from "./Markdown";
import { MathText } from "./MathText";
import { firstSentence, shorten } from "./StatusLine";

export type View = "rendered" | "plain";
const VIEW_KEY = "lean-view";

export function useView(): [View, (v: View) => void] {
  const [view, setView] = useState<View>(() => {
    try {
      return localStorage.getItem(VIEW_KEY) === "plain" ? "plain" : "rendered";
    } catch {
      return "rendered";
    }
  });
  const set = (v: View) => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* ignore */
    }
  };
  return [view, set];
}

export function blockAnchor(b: Block): string {
  return b.fq_name ? `decl-${b.fq_name.replace(/[^\w.]/g, "_")}` : `block-${b.i}`;
}

function shortName(fq: string): string {
  return fq.split(".").slice(-1)[0];
}

interface Props {
  entry: Entry;
  view: View;
  setView: (v: View) => void;
  alts: Alts | null;
  requestAlts: () => void;
  altsLoading: boolean;
}

export function LeanFile({ entry, view, setView, alts, requestAlts, altsLoading }: Props) {
  return (
    <section className="lean-file" id="lean">
      <div className="section-head">
        <h2>Lean file</h2>
        <div className="view-toggle" role="group" aria-label="View">
          <button className={view === "rendered" ? "active" : ""} onClick={() => setView("rendered")}>
            Rendered
          </button>
          <button className={view === "plain" ? "active" : ""} onClick={() => setView("plain")}>
            Plain
          </button>
        </div>
      </div>
      {view === "plain" ? (
        <Code code={entry.lean} startLine={1} className="whole-file" />
      ) : (
        <Rendered entry={entry} alts={alts} requestAlts={requestAlts} altsLoading={altsLoading} />
      )}
    </section>
  );
}

function Rendered({ entry, alts, requestAlts, altsLoading }: Omit<Props, "view" | "setView">) {
  const blocks = entry.blocks;
  const claimByPos = new Map(entry.claims.map((c) => [c.position, c]));
  const items: React.ReactNode[] = [];
  const moduleDocIndex = blocks.findIndex((b) => b.kind === "module_doc");
  // preamble: everything before the module docstring (license + imports)
  const preamble = blocks.slice(0, moduleDocIndex === -1 ? 0 : moduleDocIndex);
  if (preamble.length) items.push(<Preamble key="pre" blocks={preamble} />);
  let i = moduleDocIndex === -1 ? 0 : moduleDocIndex;
  while (i < blocks.length) {
    const b = blocks[i];
    if (b.kind === "module_doc") {
      items.push(<ModuleDoc key={b.i} block={b} />);
      i += 1;
      continue;
    }
    if (b.kind === "decl" && b.role === "check") {
      // fold a run of sanity checks (test / API lemmas and examples)
      let j = i;
      while (j < blocks.length && blocks[j].kind === "decl" && blocks[j].role === "check") j += 1;
      items.push(<Checks key={`checks-${b.i}`} blocks={blocks.slice(i, j)} />);
      i = j;
      continue;
    }
    if (b.kind === "decl") {
      items.push(
        <DeclBlock
          key={b.i}
          block={b}
          entry={entry}
          claim={b.claim ? claimByPos.get(b.claim) : undefined}
          alts={alts}
          requestAlts={requestAlts}
          altsLoading={altsLoading}
        />,
      );
      i += 1;
      continue;
    }
    items.push(<CommandLine key={b.i} block={b} />);
    i += 1;
  }
  return <div className="rendered">{items}</div>;
}

function Preamble({ blocks }: { blocks: Block[] }) {
  const text = blocks.map((b) => b.text).join("");
  const n = text.replace(/\n$/, "").split("\n").length;
  return (
    <details className="preamble">
      <summary>
        <span className="muted">License header and imports · {n} lines</span>
      </summary>
      <Code code={text.replace(/\n+$/, "")} startLine={blocks[0].line} />
    </details>
  );
}

function ModuleDoc({ block }: { block: Block }) {
  const inner = block.text
    .trim()
    .replace(/^\/-!/, "")
    .replace(/-\/$/, "")
    .trim();
  const paragraphs = inner.replace(/^\s*#\s+[^\n]*\n?/, "").split(/\n\s*\n/);
  const first = paragraphs[0] ?? "";
  const rest = paragraphs.slice(1).join("\n\n").trim();
  return (
    <div className="module-doc">
      <div className="fence muted">/-!</div>
      <Markdown text={first} className="module-doc-body" />
      {rest && (
        <Disclosure summary="Show full docstring" className="module-doc-more">
          <Markdown text={rest} />
        </Disclosure>
      )}
      <div className="fence muted">-/</div>
    </div>
  );
}

function CommandLine({ block }: { block: Block }) {
  const text = block.text.replace(/\n+$/, "");
  return (
    <div className={`command-line kind-${block.kind}`} id={blockAnchor(block)}>
      <Code code={text} startLine={block.line} />
    </div>
  );
}

function Checks({ blocks }: { blocks: Block[] }) {
  const n = blocks.length;
  const label = `${n} ${n === 1 ? "sanity check" : "sanity checks"}`;
  return (
    <details className="checks">
      <summary>
        <span className="muted">{label}</span>
        <span className="check-sigs">
          {blocks.map((b) => (
            <code key={b.i} className="sig">
              {b.decl_kind === "example" ? "example" : shortName(b.fq_name ?? "")}
            </code>
          ))}
        </span>
      </summary>
      <div className="checks-body">
        {blocks.map((b) => (
          <div key={b.i} className="decl check" id={blockAnchor(b)}>
            <div className="decl-head">
              <CategoryChip category={b.category} outlined />
              <code className="fq">{b.fq_name ?? b.decl_kind}</code>
              <span className="muted kind">{b.decl_kind}</span>
            </div>
            {b.docstring && <Markdown text={b.docstring} className="docstring" />}
            <Code code={b.code ?? ""} startLine={b.code_line} />
          </div>
        ))}
      </div>
    </details>
  );
}

function copyText(text: string) {
  navigator.clipboard?.writeText(text).catch(() => undefined);
}

interface DeclProps {
  block: Block;
  entry: Entry;
  claim: Claim | undefined;
  alts: Alts | null;
  requestAlts: () => void;
  altsLoading: boolean;
}

function DeclBlock({ block: b, entry, claim, alts, requestAlts, altsLoading }: DeclProps) {
  const role = b.role ?? "other";
  const known = role === "known_result";
  const kept = role === "statement";
  const additional = role === "additional_statement";
  const definition = role === "definition";
  const blocksById = entry.blocks;
  const uses = (b.uses ?? []).map((i) => blocksById[i]).filter((x) => x.role === "definition");
  const usedBy = (b.used_by ?? []).map((i) => blocksById[i]);
  const caption =
    kept && claim && claim.source_text !== entry.statement ? claim.source_text : known ? (kept ? "known result, stated as part of the problem" : "known result") : null;
  return (
    <div className={`decl role-${role} ${known ? "tinted" : ""}`} id={blockAnchor(b)}>
      <div className="decl-head">
        <CategoryChip category={b.category} outlined={known || role === "check"} />
        {kept && <span className="chip statement-no">statement {claim?.position}</span>}
        {additional && <span className="chip muted" title="A research open theorem the pipeline added beyond the claims it was asked to state">additional statement</span>}
        <code className="fq" title="Fully qualified name (click to copy)" onClick={() => b.fq_name && copyText(b.fq_name)}>
          {b.fq_name ?? (b.decl_kind === "instance" ? "instance" : b.decl_kind)}
        </code>
        <span className="muted kind">{[...(b.modifiers ?? []), b.decl_kind].join(" ")}</span>
      </div>
      {caption && (
        <div className={`caption ${known ? "known" : "source"}`}>
          {known ? caption : <><span className="muted">Source: </span><MathText text={caption} /></>}
        </div>
      )}
      {b.leading_comment && <Code code={b.leading_comment} className="leading-comment" />}
      {b.prefix && <Code code={b.prefix} className="prefix" />}
      {b.docstring && <Markdown text={b.docstring} className="docstring" />}
      <Code code={b.code ?? ""} startLine={b.code_line} />
      {(kept || additional || known) && uses.length > 0 && (
        <p className="uses muted">
          uses:{" "}
          {uses.map((u, k) => (
            <span key={u.i}>
              {k > 0 ? ", " : ""}
              <a href={`#${blockAnchor(u)}`} onClick={jumpTo(u)}>
                <code>{shortName(u.fq_name ?? "")}</code>
              </a>
            </span>
          ))}
        </p>
      )}
      {definition && <DefinitionNotes block={b} usedBy={usedBy} />}
      {kept && claim && claim.reviewer_why && (
        <Disclosure summary={<><strong>Notes on this statement</strong> <span className="muted">· <MathText text={shorten(firstSentence(claim.reviewer_why), 220)} /></span></>} className="statement-notes">
          <p className="verbatim-label muted">The automated reviewer's note on this statement, verbatim:</p>
          <Markdown text={claim.reviewer_why} />
        </Disclosure>
      )}
      {kept && claim && claim.slot && (
        <OtherFormulations entry={entry} claim={claim} alts={alts} requestAlts={requestAlts} loading={altsLoading} />
      )}
    </div>
  );
}

function jumpTo(target: Block) {
  return (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById(blockAnchor(target))?.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", `#${blockAnchor(target)}`);
  };
}

function DefinitionNotes({ block: b, usedBy }: { block: Block; usedBy: Block[] }) {
  const j = b.justification;
  return (
    <div className="def-notes">
      {j ? (
        <>
          {j.closest_existing_considered && (
            <p className="mathlib muted">
              Mathlib: <MathText text={j.closest_existing_considered} />
            </p>
          )}
          {j.why_needed && (
            <Disclosure summary={<span className="muted">Why needed</span>} className="why-needed">
              <p>
                <MathText text={j.why_needed} />
              </p>
              <p className="muted small">From the formalizer's report ({j.from_attempt}).</p>
            </Disclosure>
          )}
        </>
      ) : (
        <p className="muted">Added or edited by the automated reviewer; see its notes below.</p>
      )}
      {usedBy.length > 0 && (
        <p className="used-by muted">
          used in:{" "}
          {usedBy.map((u, k) => (
            <span key={u.i}>
              {k > 0 ? ", " : ""}
              <a href={`#${blockAnchor(u)}`} onClick={jumpTo(u)}>
                <code>{u.fq_name ? shortName(u.fq_name) : u.decl_kind}</code>
              </a>
            </span>
          ))}
        </p>
      )}
    </div>
  );
}

function OtherFormulations({ entry, claim, alts, requestAlts, loading }: { entry: Entry; claim: Claim; alts: Alts | null; requestAlts: () => void; loading: boolean }) {
  const slot = claim.slot!;
  const others = useMemo(
    () => (alts ? alts.attempts.filter((a) => a.cid !== claim.winner_attempt && a.compile_ok && a.statement_blocks[slot]) : null),
    [alts, claim.winner_attempt, slot],
  );
  const candidates = entry.attempts.list.filter((a) => a.cid !== claim.winner_attempt && a.compile_ok && a.slot_outcomes[slot]?.startsWith("formalized")).length;
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (open) requestAlts();
  }, [open, requestAlts]);
  if (candidates === 0) return null;
  const n = others ? others.length : candidates;
  return (
    <details className="disclosure other-formulations" onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary>
        <strong>Other formulations</strong> <span className="muted">({n})</span>
      </summary>
      <div className="disclosure-body">
        <p className="muted small">
          The same statement as written by the other compiling attempts. The automated reviewer chose {claim.winner_attempt} ({claim.winner_model}){" "}
          {claim.winner_attempt && entry.attempts.main === claim.winner_attempt ? "as the basis of this file" : "for this statement"}.
        </p>
        {loading && !alts && <p className="muted">Loading…</p>}
        {others?.map((a) => (
          <div key={a.cid} className="alt">
            <div className="alt-head muted">
              <code>{a.cid}</code> · {a.model_name}
            </div>
            <Code code={a.statement_blocks[slot]} />
          </div>
        ))}
        {others && others.length === 0 && <p className="muted">No other compiling attempt states this claim under its name.</p>}
      </div>
    </details>
  );
}
