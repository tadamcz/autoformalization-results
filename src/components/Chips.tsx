import type { FcStatusEntry, IndexEntry } from "../data/schema";
import { formatDate } from "../data/filters";

// The list row's right-hand chips: omissions, not-stated parts, FC status.
export function EntryChips({ entry, fc }: { entry: IndexEntry; fc: FcStatusEntry | undefined }) {
  const o = entry.outcome;
  const omitted = o.statements_total - o.statements_kept;
  return (
    <span className="chips">
      {omitted > 0 && (
        <span className="chip warn" title="The automated reviewer could not make these statements faithful and omitted them">
          {omitted} of {o.statements_total} omitted
        </span>
      )}
      {entry.counts.dropped > 0 && (
        <span className="chip muted" title="Parts of the entry with no statable claim, or known results, were not stated">
          {entry.counts.dropped} not stated
        </span>
      )}
      {entry.counts.open === 0 && <span className="chip muted">no open statement</span>}
      {fc && (
        <a className="chip fc" href={fc.url} target="_blank" rel="noopener noreferrer" title={fc.path} onClick={(e) => e.stopPropagation()}>
          in FC{fc.added ? ` since ${formatDate(fc.added)}` : ""}
        </a>
      )}
    </span>
  );
}

export function CountsLine({ entry }: { entry: IndexEntry }) {
  const c = entry.counts;
  return (
    <span className="counts">
      {c.open} open
      {c.known > 0 && <span className="muted"> · +{c.known} known {c.known === 1 ? "result" : "results"}</span>}
      {` · ${c.defs} ${c.defs === 1 ? "def" : "defs"} · ${entry.lean_lines} lines`}
      <span className="muted" title="The automated reviewer's confidence that every statement in the file is faithful">
        {" "}
        · confidence {entry.confidence.toFixed(2)}
      </span>
    </span>
  );
}
