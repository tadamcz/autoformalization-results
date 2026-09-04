import type { Claim, Entry, FcStatusEntry } from "../data/schema";
import { formatDate } from "../data/filters";
import { MathText } from "./MathText";

export function firstSentence(text: string): string {
  const t = text.trim();
  const m = /[.!?](?=\s|$)/.exec(t);
  return m ? t.slice(0, m.index + 1) : t;
}

// Only when something is notable: partial coverage, already in FC, no open statement.
export function StatusLine({ entry, fc }: { entry: Entry; fc: FcStatusEntry | undefined }) {
  const omitted = entry.claims.filter((c) => c.kind === "omitted");
  const notStated = entry.claims.filter((c) => c.kind === "not_stated");
  const items: React.ReactNode[] = [];
  if (fc) {
    items.push(
      <span key="fc" className="status fc">
        Already in Formal Conjectures{fc.added ? ` since ${formatDate(fc.added)}` : ""} (
        <a href={fc.url} target="_blank" rel="noopener noreferrer">
          view FC file
        </a>
        ). This file was written before that.
      </span>,
    );
  }
  if (entry.counts.open === 0) {
    const reason = notStated[0] ? firstSentence(notStated[0].decomposer_note) : omitted[0] ? firstSentence(omitted[0].reviewer_why ?? "") : "";
    items.push(
      <span key="noopen" className="status warn">
        No open statement in this file{reason ? <>: <MathText text={reason} /></> : "."}{" "}
        {entry.counts.known > 0 && (
          <>
            Contains {entry.counts.known} known {entry.counts.known === 1 ? "result" : "results"}.
          </>
        )}
      </span>,
    );
  } else if (entry.outcome.kind === "partial") {
    items.push(
      <span key="partial" className="status warn">
        Covers {entry.outcome.statements_kept} of {entry.outcome.statements_total} statements.{" "}
        {omitted.length > 0 && (
          <>
            Omitted: <OmittedList claims={omitted} />
          </>
        )}
      </span>,
    );
  }
  if (!items.length) return null;
  return <div className="status-line">{items}</div>;
}

function OmittedList({ claims }: { claims: Claim[] }) {
  return (
    <>
      {claims.map((c, i) => (
        <span key={c.position}>
          {i > 0 ? " " : ""}
          <em>
            <MathText text={shorten(c.source_text, 90)} />
          </em>
          {c.reviewer_why ? <> — <MathText text={firstSentence(c.reviewer_why)} /></> : null}
        </span>
      ))}
    </>
  );
}

export function shorten(text: string, n: number): string {
  if (text.length <= n) return text;
  // do not cut inside $…$
  let cut = n;
  const dollars = [...text.slice(0, cut).matchAll(/\$/g)].length;
  if (dollars % 2 === 1) {
    const close = text.indexOf("$", cut);
    cut = close === -1 ? text.length : close + 1;
  }
  return text.slice(0, cut).trimEnd() + "…";
}
