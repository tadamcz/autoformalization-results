import { useEffect } from "react";
import { Link } from "react-router";
import { TopBar } from "../components/TopBar";
import { HOW_PRODUCED, proverSentence } from "../components/ProvenanceDrawer";
import { formatDate, median } from "../data/filters";
import { useIndex } from "../data/load";

const REPO_URL = "https://github.com/tadamcz/autoformalization-results";

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
  const o = m.outcomes;
  const accepted = (o.shown ?? 0) + (o.below_threshold ?? 0);
  const gens = m.models.generators.map((g) => g.name);
  const settled = m.prover_settled_confidences;
  const med = median(index.data.entries.map((e) => e.confidence));
  return (
    <>
      <TopBar />
      <main className="page narrow about">
        <h1>About</h1>
        <p>
          These are {m.n_entries} Lean 4 files, each stating an entry from Wikipedia's{" "}
          <a href={m.list_url} target="_blank" rel="noopener noreferrer">
            list of unsolved problems in mathematics
          </a>{" "}
          that was not in{" "}
          <a href={m.fc_repo_url} target="_blank" rel="noopener noreferrer">
            google-deepmind/formal-conjectures
          </a>{" "}
          on {formatDate(m.fc.commit_date)}. An automated pipeline (language models plus the Lean compiler) wrote them; no human has checked them. Each compiles against Formal
          Conjectures at that date. Treat them as drafts: for every file the site shows the source text, the file itself and what the pipeline flagged, so you can judge
          faithfulness quickly.
        </p>

        <h2>Selection</h2>
        <p>
          The pipeline attempted {o.attempted} entries. It produced a file it was willing to stand behind for {accepted}; for {o.refused} it produced nothing (no attempt could
          state the entry faithfully, or the entry had no statable claim), and {o.failed} were discarded because the final file failed a check or the prover settled a
          statement. Of the {accepted} accepted files, the {m.n_entries} shown here are those whose automated reviewer reported a confidence of at least {m.min_confidence} that
          every statement in the file is faithful; the {o.below_threshold} below that cut are not shown. Each file page shows that confidence and the list can be filtered by it.
          Treat it as a weak signal
          {settled.length > 0 ? (
            <>
              : the prover later proved or refuted a statement in {settled.length} {settled.length === 1 ? "file" : "files"} the reviewer had passed, with{" "}
              {settled.length === 1 ? "confidence" : "confidences"} {settled.map((c) => c.toFixed(2)).join(", ")}
              {med !== null ? `; the median across the files shown here is ${med.toFixed(2)}` : ""}.
            </>
          ) : (
            "."
          )}
        </p>

        <h2>How each file was produced</h2>
        <p>{HOW_PRODUCED}</p>
        <p>
          The {m.attempts_per_entry} attempts per entry were written by {gens.join(" and ")} ({m.attempts_per_entry / Math.max(1, gens.length)} each); the splitting into
          claims and the final review were done by {m.models.adjudicator.name}; the prover was {m.models.prover.name}. {proverSentence(m.probe_budget_minutes)}
        </p>

        <h2>Data</h2>
        <p>
          The Wikipedia list and articles were read on {formatDate(m.wikipedia_snapshot)}. The files compile against Formal Conjectures commit <code>{m.fc.commit.slice(0, 7)}</code>{" "}
          ({formatDate(m.fc.commit_date)}; {m.fc.lean_toolchain}
          {m.fc.mathlib_rev ? `, Mathlib ${m.fc.mathlib_rev.slice(0, 7)}` : ""}). Whether Formal Conjectures has since gained a file for an entry is re-checked when the site is
          rebuilt; such entries are marked but kept.
        </p>
        <p>
          Source data and this site:{" "}
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
            {REPO_URL.replace("https://", "")}
          </a>
          . Full transcripts of every model call (run {m.run_id}):{" "}
          <a href={m.transcript_base} target="_blank" rel="noopener noreferrer">
            Inspect log viewer
          </a>
          .
        </p>

        <p className="made-by">
          Made by Tom Adamczewski · <a href="mailto:tom@epoch.ai">tom@epoch.ai</a>
        </p>
        <p>
          <Link to="/">← All files</Link>
        </p>
      </main>
    </>
  );
}
