import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { Actions, Crumbs, FileLine, PrevNext } from "../components/EntryHeader";
import { InFileChips } from "../components/InFileChips";
import { LeanFile, useView } from "../components/LeanFile";
import { findBlockByAnchor, rememberAnchor, scrollToBlock, withoutAt } from "../components/anchors";
import { ProvenanceDrawer } from "../components/ProvenanceDrawer";
import { ReviewerNotes } from "../components/ReviewerNotes";
import { SourcePane } from "../components/SourcePane";
import { StatusLine } from "../components/StatusLine";
import { TopBar } from "../components/TopBar";
import { MathText } from "../components/MathText";
import { applyFilters, neighbours, parseState } from "../data/filters";
import { useAlts, useEntry, useFcStatus, useIndex } from "../data/load";

export function EntryPage() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const index = useIndex();
  const fc = useFcStatus();
  const entry = useEntry(id);
  const [altsWanted, setAltsWanted] = useState(false);
  const alts = useAlts(id, altsWanted);
  const requestAlts = useCallback(() => setAltsWanted(true), []);
  const [view, setView] = useView();

  const state = useMemo(() => parseState(params), [params]);
  const fcData = fc.status === "ok" ? fc.data : null;
  const ids = useMemo(
    () => (index.status === "ok" ? applyFilters(index.data.entries, state, fcData).map((e) => e.id) : []),
    [index, state, fcData],
  );
  const nav = id ? neighbours(ids, id) : { prev: null, next: null };

  useEffect(() => {
    if (entry.status === "ok") document.title = `${entry.data.title.replace(/\$/g, "")} · Autoformalized conjectures`;
  }, [entry]);

  useEffect(() => {
    // print: expand every disclosure
    const before = () => document.querySelectorAll("details").forEach((d) => d.setAttribute("open", ""));
    window.addEventListener("beforeprint", before);
    return () => window.removeEventListener("beforeprint", before);
  }, []);

  useEffect(() => {
    // reset alts + scroll when the entry changes (a deep link scrolls itself)
    setAltsWanted(false);
    if (!params.get("at")) window.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const search = withoutAt(params.toString());

  const jump = (block: number) => {
    if (entry.status !== "ok") return;
    const b = entry.data.blocks[block];
    rememberAnchor(entry.data.id, search, b);
    if (!scrollToBlock(b, view)) {
      requestAnimationFrame(() => scrollToBlock(b, view));
    }
  };

  // deep link: #/p/<id>?at=<anchor> scrolls to that declaration once rendered
  const at = params.get("at");
  useEffect(() => {
    if (!at || entry.status !== "ok") return;
    const b = findBlockByAnchor(entry.data, at);
    if (!b) return;
    let tries = 0;
    const attempt = () => {
      if (scrollToBlock(b, view) || tries++ > 20) return;
      window.setTimeout(attempt, 100);
    };
    attempt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [at, entry.status, id]);
  return (
    <>
      <TopBar>
        <PrevNext prev={nav.prev} next={nav.next} search={search} />
      </TopBar>
      <main className="page entry">
        {entry.status === "loading" && <p className="muted">Loading…</p>}
        {entry.status === "error" && <p className="error">Could not load this file: {entry.error}</p>}
        {entry.status === "ok" && index.status === "ok" && (
          <>
            <Crumbs entry={entry.data} meta={index.data.meta} search={search} />
            <h1>
              <MathText text={entry.data.title} />
            </h1>
            <StatusLine entry={entry.data} fc={fcData?.entries[entry.data.id]} />
            <Actions entry={entry.data} fc={fcData?.entries[entry.data.id]} />
            <FileLine entry={entry.data} />
            <SourcePane entry={entry.data} onJump={jump} />
            <InFileChips entry={entry.data} onJump={jump} search={search} />
            <LeanFile
              entry={entry.data}
              view={view}
              setView={setView}
              alts={alts.status === "ok" ? alts.data : null}
              requestAlts={requestAlts}
              altsLoading={altsWanted && alts.status === "loading"}
              onJump={jump}
              search={search}
            />
            <ReviewerNotes entry={entry.data} />
            <ProvenanceDrawer entry={entry.data} meta={index.data.meta} alts={alts.status === "ok" ? alts.data : null} requestAlts={requestAlts} />
          </>
        )}
      </main>
    </>
  );
}
