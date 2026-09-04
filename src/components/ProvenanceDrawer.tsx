import { diffLines } from "diff";
import { useEffect, useMemo, useState } from "react";
import type { Alts, Entry, Meta } from "../data/schema";
import { Disclosure } from "./Disclosure";
import { Markdown } from "./Markdown";
import { MathText } from "./MathText";
import { claimGlyph, claimNote } from "./SourcePane";
import { firstSentence, shorten } from "./StatusLine";

export const HOW_PRODUCED =
  "The Wikipedia entry and article were split into claims statable in Lean. Eight independent attempts by two models each wrote a file and compiled it against Formal Conjectures. A separate model compared the compiling attempts with the source, chose or combined the most faithful, omitted statements it could not make faithful, and wrote the notes above. Finally a prover spent up to an hour trying to prove or refute each statement; success would have discarded the file.";

export function proverSentence(minutes: number): string {
  return `Automated prover: tried for ${minutes} minutes to prove or refute the statements in this file and did neither. This rules out only trivially true or false formalizations.`;
}

interface Props {
  entry: Entry;
  meta: Meta;
  alts: Alts | null;
  requestAlts: () => void;
}

export function ProvenanceDrawer({ entry, meta, alts, requestAlts }: Props) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (open) requestAlts();
  }, [open, requestAlts]);
  const a = entry.attempts;
  const models = [...new Set(a.list.map((x) => x.model_name))];
  const chosenCids = [...new Set(Object.values(a.chosen).filter((x): x is string => !!x))];
  const edited = alts ? (() => {
    const main = alts.attempts.find((x) => x.cid === alts.main_attempt);
    return main?.code ? main.code !== entry.lean : null;
  })() : null;
  return (
    <details className="drawer" id="provenance" onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary>
        <h2>How this file was produced</h2>
      </summary>
      <div className="drawer-body">
        <p className="fixed">{HOW_PRODUCED}</p>

        <h3>Claims</h3>
        <table className="claims-table">
          <thead>
            <tr>
              <th>Passage</th>
              <th>Outcome</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {entry.claims.map((c) => {
              const g = claimGlyph(c.kind);
              const note = claimNote(c);
              return (
                <tr key={c.position} className={g.css}>
                  <td>
                    <MathText text={c.source_text} />
                    {c.slot && (
                      <div className="muted small">
                        <code>{c.slot}</code>
                      </div>
                    )}
                  </td>
                  <td className="nowrap">
                    <span className={`glyph ${g.css}`}>{g.glyph}</span> {g.label}
                    {c.kind === "stated" && c.winner_attempt && (
                      <div className="muted small">
                        from {c.winner_attempt} ({c.winner_model})
                      </div>
                    )}
                  </td>
                  <td>
                    {note ? (
                      <Disclosure summary={<MathText text={shorten(firstSentence(note), 220)} />}>
                        <Markdown text={note} />
                      </Disclosure>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <h3>Attempts</h3>
        <p>
          {a.total} attempts by {models.length === 2 ? "two models" : `${models.length} model${models.length === 1 ? "" : "s"}`} ({models.join(", ")}), {a.compiled} compiled
          {a.bailed ? `, ${a.bailed} declined to write a file` : ""}.{" "}
          {chosenCids.length > 0 && (
            <>
              Chosen: {chosenCids.join(", ")}
              {edited === true ? " with edits" : edited === false ? " unchanged" : ""}.
            </>
          )}
          {a.compiled === 1 && <strong> Only one attempt compiled.</strong>}
        </p>
        <table className="attempts-table">
          <thead>
            <tr>
              <th>Attempt</th>
              <th>Model</th>
              <th>Compiled</th>
              <th>Statements</th>
              <th>Own confidence</th>
            </tr>
          </thead>
          <tbody>
            {a.list.map((x) => {
              const stated = Object.values(x.slot_outcomes).filter((o) => o.startsWith("formalized")).length;
              const total = Object.keys(x.slot_outcomes).length;
              const chosenFor = Object.entries(a.chosen).filter(([, cid]) => cid === x.cid).length;
              return (
                <tr key={x.cid} className={chosenFor ? "chosen" : ""}>
                  <td>
                    <code>{x.cid}</code>
                    {chosenFor ? <span className="muted small"> chosen for {chosenFor}</span> : null}
                  </td>
                  <td>{x.model_name}</td>
                  <td>{x.bailed ? <span className="muted">declined</span> : x.compile_ok ? "yes" : "no"}</td>
                  <td>{x.bailed ? "—" : `${stated} of ${total}`}</td>
                  <td>{x.confidence === null ? "—" : x.confidence.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="muted small">"Own confidence" is each attempt's self-reported probability that its file is faithful; the automated reviewer did not see which model wrote which attempt.</p>

        <EditsDiff entry={entry} alts={alts} />

        {(entry.modeling_decisions.length > 0 || entry.decomposition_objections.length > 0) && (
          <>
            <h3>Modelling decisions reported by the chosen attempts</h3>
            {entry.modeling_decisions.map((m) => (
              <div key={m.attempt} className="decisions">
                <p className="muted small">
                  {m.attempt} ({m.model})
                </p>
                <ul>
                  {m.items.map((it, k) => (
                    <li key={k}>
                      <Markdown text={it} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {entry.decomposition_objections.map((o) => (
              <div key={o.attempt} className="objections">
                <p className="muted small">
                  {o.attempt} ({o.model}) objected to how the entry was split into claims:
                </p>
                <Markdown text={o.text} />
              </div>
            ))}
          </>
        )}

        <h3>Checks</h3>
        <ul className="checks-list">
          <li>
            Compiled against Formal Conjectures <code>{entry.fc.commit.slice(0, 7)}</code> ({entry.fc.lean_toolchain}
            {entry.fc.mathlib_rev ? `, Mathlib ${entry.fc.mathlib_rev.slice(0, 7)}` : ""}):{" "}
            {entry.checks.compiled ? "no errors" : "errors"}
            {entry.checks.sorry_lines.length ? `; ${entry.checks.sorry_lines.length} declaration${entry.checks.sorry_lines.length === 1 ? "" : "s"} use sorry (line${entry.checks.sorry_lines.length === 1 ? "" : "s"} ${entry.checks.sorry_lines.join(", ")})` : ""}
            {entry.checks.disallowed_warnings.length ? (
              <ul>
                {entry.checks.disallowed_warnings.map((w, k) => (
                  <li key={k}>
                    warning{w.line ? ` (line ${w.line})` : ""}: <code>{w.text}</code>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
          <li>{entry.checks.probe.ran ? proverSentence(entry.checks.probe.budget_minutes) : "The automated prover did not run on this file."}</li>
        </ul>

        {entry.references.length > 0 && (
          <>
            <h3>Papers available to the pipeline</h3>
            <ul className="papers">
              {entry.references.map((r) => (
                <li key={r.id}>
                  <a href={r.url} target="_blank" rel="noopener noreferrer">
                    arXiv:{r.id}
                  </a>{" "}
                  <MathText text={r.title} />
                </li>
              ))}
            </ul>
          </>
        )}

        <h3>Transcript</h3>
        <p>
          <a href={entry.transcript_url} target="_blank" rel="noopener noreferrer">
            Open the full transcript
          </a>{" "}
          <span className="muted">(Inspect log viewer; every model call of this entry, run {meta.run_id})</span>
        </p>
      </div>
    </details>
  );
}

function EditsDiff({ entry, alts }: { entry: Entry; alts: Alts | null }) {
  const main = alts?.attempts.find((x) => x.cid === alts.main_attempt);
  const hunks = useMemo(() => {
    if (!main?.code) return null;
    const parts = diffLines(main.code, entry.lean);
    return parts;
  }, [main, entry.lean]);
  if (!alts) return <p className="muted">Loading the chosen attempt…</p>;
  if (!main?.code) return null;
  if (main.code === entry.lean) {
    return (
      <p>
        The final file is {main.cid} unchanged.
      </p>
    );
  }
  const added = hunks!.filter((p) => p.added).reduce((n, p) => n + (p.count ?? 0), 0);
  const removed = hunks!.filter((p) => p.removed).reduce((n, p) => n + (p.count ?? 0), 0);
  return (
    <Disclosure summary={<><strong>Edits by the automated reviewer</strong> <span className="muted">· {main.cid} → final file: +{added} −{removed} lines</span></>} className="edits">
      <pre className="diff">
        {hunks!.map((p, k) => {
          if (p.added || p.removed) {
            return (
              <span key={k} className={p.added ? "add" : "del"}>
                {p.value.replace(/\n$/, "").split("\n").map((l, j) => (
                  <span className="line" key={j}>
                    {p.added ? "+ " : "− "}
                    {l}
                    {"\n"}
                  </span>
                ))}
              </span>
            );
          }
          const lines = p.value.replace(/\n$/, "").split("\n");
          if (lines.length > 6) {
            const head = k === 0 ? [] : lines.slice(0, 3);
            const tail = k === hunks!.length - 1 ? [] : lines.slice(-3);
            const hidden = lines.length - head.length - tail.length;
            return (
              <span key={k} className="ctx">
                {head.map((l) => `  ${l}\n`).join("")}
                <span className="skip">  … {hidden} unchanged lines …{"\n"}</span>
                {tail.map((l) => `  ${l}\n`).join("")}
              </span>
            );
          }
          return (
            <span key={k} className="ctx">
              {lines.map((l) => `  ${l}\n`).join("")}
            </span>
          );
        })}
      </pre>
    </Disclosure>
  );
}
