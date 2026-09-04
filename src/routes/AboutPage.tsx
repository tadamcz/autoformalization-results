import { useEffect } from "react";
import { Link } from "react-router";
import { orderedSources } from "../components/AreaSidebar";
import { TopBar } from "../components/TopBar";
import { howProduced, proverBudget } from "../components/ProvenanceDrawer";
import { formatDate } from "../data/filters";
import { useIndex } from "../data/load";
import type { Meta, SourceMeta } from "../data/schema";

const REPO_URL = "https://github.com/tadamcz/autoformalization-results";

function joinWithAnd(parts: React.ReactNode[]): React.ReactNode[] {
  return parts.flatMap((p, i) => (i === 0 ? [p] : [i === parts.length - 1 ? " and " : ", ", p]));
}

export function AboutPage() {
  const index = useIndex();
  useEffect(() => {
    document.title = "About · Autoformalized conjectures";
  }, []);
  if (index.status !== "ok") {
    return (
      <>
        <TopBar />
        <main className="page narrow">{index.status === "loading" ? <p className="muted">Loading…</p> : <p className="error">{index.error}</p>}</main>
      </>
    );
  }
  const m = index.data.meta;
  const sources = orderedSources(m);
  return (
    <>
      <TopBar />
      <main className="page narrow about">
        <h1>About</h1>
        <p>
          These are {m.n_entries} Lean 4 files, each stating an open problem from{" "}
          {joinWithAnd(
            sources.map(([key, s]) => (
              <span key={key}>
                <a href={s.url} target="_blank" rel="noopener noreferrer">
                  {s.name}
                </a>{" "}
                ({s.n_entries} files)
              </span>
            )),
          )}{" "}
          that was not in{" "}
          <a href={m.fc_repo_url} target="_blank" rel="noopener noreferrer">
            google-deepmind/formal-conjectures
          </a>{" "}
          on {formatDate(m.fc.commit_date)}. An automated pipeline (language models plus the Lean compiler) wrote them; no human has checked them. Each compiles against Formal
          Conjectures at that date. Treat them as drafts: for every file the site shows the source text, the file itself and what the pipeline flagged, so you can judge
          faithfulness quickly.
        </p>

        <h2>Selection</h2>
        {sources.map(([key, s]) => (
          <Selection key={key} s={s} meta={m} />
        ))}
        <p>Each file page shows the reviewer's confidence and the list can be filtered by it.</p>

        <h2>How each file was produced</h2>
        <p>{howProduced(null)}</p>
        {sources.map(([key, s]) => {
          const r = s.run;
          const gens = r.models.generators.map((g) => g.name);
          return (
            <p key={key}>
              For the {s.short_name}, the {r.attempts_per_entry} attempts per entry were written by {gens.join(" and ")} ({r.attempts_per_entry / Math.max(1, gens.length)} each);
              the splitting into claims and the final review were done by {r.models.adjudicator.name}; the prover was {r.models.prover.name} and tried{" "}
              {proverBudget(r.probe_budget)} per file.
            </p>
          );
        })}

        <h2>Data</h2>
        {sources.map(([key, s]) => (
          <p key={key}>
            <SourceData source={key} s={s} />
          </p>
        ))}
        <p>
          The files compile against Formal Conjectures commit <code>{m.fc.commit.slice(0, 7)}</code> ({formatDate(m.fc.commit_date)}; {m.fc.lean_toolchain}
          {m.fc.mathlib_rev ? `, Mathlib ${m.fc.mathlib_rev.slice(0, 7)}` : ""}). Whether Formal Conjectures has since gained a file for an entry is re-checked when the site is
          rebuilt; such entries are marked but kept.
        </p>
        <p>
          Source data and this site:{" "}
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
            {REPO_URL.replace("https://", "")}
          </a>
          . Full transcripts of every model call:{" "}
          {joinWithAnd(
            sources.map(([key, s]) => (
              <span key={key}>
                <a href={s.run.transcript_base} target="_blank" rel="noopener noreferrer">
                  {s.short_name}
                </a>{" "}
                (run {s.run.run_id})
              </span>
            )),
          )}{" "}
          in the Inspect log viewer.
        </p>

        <p className="made-by">
          Made by{" "}
          <a href="https://tadamcz.com/" target="_blank" rel="noopener noreferrer">
            Tom Adamczewski
          </a>
        </p>
        <p>
          <Link to="/">← All files</Link>
        </p>
      </main>
    </>
  );
}

// One source's funnel: attempted -> accepted -> shown.
function Selection({ s, meta }: { s: SourceMeta; meta: Meta }) {
  const o = s.run.outcomes;
  const accepted = (o.shown ?? 0) + (o.below_threshold ?? 0);
  return (
    <p>
      <strong>{s.short_name}.</strong> The pipeline attempted {o.attempted} entries. It produced a file it was willing to stand behind for {accepted}; for {o.refused} it produced
      nothing (no attempt could state the entry faithfully, or the entry had no statable claim), and {o.failed} were discarded because the final file failed a check or the
      prover settled a statement. Of the {accepted} accepted files, the {s.n_entries} shown here are those whose automated reviewer reported a confidence of at least{" "}
      {meta.min_confidence} that every statement in the file is faithful; the {o.below_threshold} below that cut are not shown.
    </p>
  );
}

function SourceData({ source, s }: { source: string; s: SourceMeta }) {
  if (source === "kourovka") {
    return (
      <>
        The Kourovka Notebook is read from the editors' TeX at{" "}
        <a href={s.url} target="_blank" rel="noopener noreferrer">
          arXiv:{s.notebook_version ?? "1401.0300"}
        </a>
        {s.snapshot ? ` (fetched on ${formatDate(s.snapshot)})` : ""}. Problems the notebook marks as solved, and those Formal Conjectures already had a file for, were left out.
        Statements are shown as written, with the TeX text rendered and the notebook's own macros applied to the mathematics; the TeX itself is one click away on each page.
      </>
    );
  }
  if (source === "wikipedia") {
    return <>The Wikipedia list and articles were read on {formatDate(s.snapshot)}.</>;
  }
  return <>{s.name} was read on {formatDate(s.snapshot)}.</>;
}
