import type { Claim, Entry } from "../data/schema";
import { Disclosure } from "./Disclosure";
import { MathText } from "./MathText";
import { firstSentence, shorten } from "./StatusLine";

// The one-line statement with each claim's span marked, the article lead
// behind a disclosure, and the Coverage list when there is more than one
// passage or anything was left out.
export function SourcePane({ entry, onJump }: { entry: Entry; onJump: (block: number) => void }) {
  const claims = entry.claims;
  const showCoverage = claims.length > 1 || claims.some((c) => c.kind !== "stated");
  const byPos = new Map(claims.map((c) => [c.position, c]));
  return (
    <section className="source" id="source">
      <h2>Source</h2>
      <blockquote className="statement">
        {entry.statement_segments.map((s, i) => {
          const c = s.ref ? byPos.get(s.ref) : undefined;
          if (!c) return <MathText key={i} text={s.text} />;
          const cls = c.kind === "stated" ? "seg stated" : c.kind === "omitted" ? "seg omitted" : "seg not-stated";
          const title = c.kind === "stated" ? `Stated as statement ${c.position}` : c.kind === "omitted" ? "Omitted by the automated reviewer" : "Not stated";
          return (
            <span key={i} className={cls} title={title} onClick={c.block !== null ? () => onJump(c.block!) : undefined} role={c.block !== null ? "link" : undefined}>
              <MathText text={s.text} />
            </span>
          );
        })}
      </blockquote>
      <p className="source-links muted">
        From{" "}
        <a href={entry.list_url} target="_blank" rel="noopener noreferrer">
          Wikipedia's list of unsolved problems
        </a>
        {entry.article_title && (
          <>
            {" "}
            · article:{" "}
            <a href={entry.article_url} target="_blank" rel="noopener noreferrer">
              {entry.article_title}
            </a>
          </>
        )}
        {entry.record_title !== entry.title && entry.record_title !== entry.statement && (
          <>
            {" "}
            · list entry: <em>{entry.record_title}</em>
          </>
        )}
      </p>
      {entry.context && (
        <Disclosure summary="From the article" className="context">
          <p>
            <MathText text={entry.context} />
          </p>
        </Disclosure>
      )}
      {showCoverage && <Coverage claims={claims} onJump={onJump} />}
    </section>
  );
}

export function claimGlyph(kind: Claim["kind"]): { glyph: string; label: string; css: string } {
  switch (kind) {
    case "stated":
      return { glyph: "●", label: "Stated", css: "stated" };
    case "omitted":
      return { glyph: "○", label: "Omitted", css: "omitted" };
    default:
      return { glyph: "–", label: "Not stated", css: "not-stated" };
  }
}

export function claimNote(c: Claim): string {
  if (c.kind === "stated") return c.reviewer_why ?? "";
  if (c.kind === "omitted") return c.reviewer_why || c.decomposer_note;
  return c.decomposer_note;
}

function Coverage({ claims, onJump }: { claims: Claim[]; onJump: (block: number) => void }) {
  const stated = claims.filter((c) => c.kind === "stated").length;
  const omitted = claims.filter((c) => c.kind === "omitted").length;
  const notStated = claims.filter((c) => c.kind === "not_stated").length;
  // one denominator (the passages listed below) so the counts add up at a glance
  const n = claims.length;
  const summary =
    stated === n
      ? `all ${n} passages stated`
      : `${n} passages: ` +
        [stated ? `${stated} stated` : null, omitted ? `${omitted} omitted` : null, notStated ? `${notStated} not stated` : null]
          .filter(Boolean)
          .join(", ");
  const rows = (
    <ol className="coverage-list">
      {claims.map((c) => {
        const g = claimGlyph(c.kind);
        const note = claimNote(c);
        return (
          <li key={c.position} className={`coverage-row ${g.css}`}>
            <span className={`glyph ${g.css}`} title={g.label}>
              {g.glyph}
            </span>
            <div className="coverage-body">
              <div className="coverage-head">
                <span className="coverage-status">{g.label}</span>
                {c.kind === "stated" && c.block !== null && (
                  <button className="linkish" onClick={() => onJump(c.block!)}>
                    statement {c.position} ↓
                  </button>
                )}
                {c.location.location === "article" && <span className="muted"> · from the article</span>}
                {c.location.location === "unlocated" && <span className="muted"> · paraphrase</span>}
              </div>
              <blockquote className="passage">
                <MathText text={c.source_text} />
              </blockquote>
              {note && (
                <Disclosure summary={<MathText text={shorten(firstSentence(note), 220)} />} className="note">
                  <p>
                    <MathText text={note} />
                  </p>
                </Disclosure>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
  return (
    <div className="coverage">
      <h3>
        Coverage <span className="muted">· {summary}</span>
      </h3>
      {claims.length > 6 ? <Disclosure summary={`Show all ${claims.length} passages`}>{rows}</Disclosure> : rows}
    </div>
  );
}
