import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { AreaSelect, AreaSidebar } from "../components/AreaSidebar";
import { CountsLine, EntryChips } from "../components/Chips";
import { MathText } from "../components/MathText";
import { TopBar } from "../components/TopBar";
import { applyFilters, capitalize, formatDate, parseState, serializeState, type ListState } from "../data/filters";
import { useFcStatus, useIndex } from "../data/load";
import type { FcStatusEntry, IndexEntry } from "../data/schema";

export function ListPage() {
  const index = useIndex();
  const fc = useFcStatus();
  const [params, setParams] = useSearchParams();
  const state = useMemo(() => parseState(params), [params]);
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);

  const update = (patch: Partial<ListState>) => {
    setParams(serializeState({ ...state, ...patch }), { replace: true });
  };

  // the search box keeps its own immediate value; the URL follows with a short delay
  const [q, setQ] = useState(state.q);
  const debounce = useRef<number | null>(null);
  useEffect(() => setQ(state.q), [state.q]);
  const onSearch = (value: string) => {
    setQ(value);
    if (debounce.current) window.clearTimeout(debounce.current);
    debounce.current = window.setTimeout(() => update({ q: value }), 150);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    document.title = "Autoformalized conjectures";
  }, []);

  if (index.status === "loading") return <Shell><p className="muted">Loading…</p></Shell>;
  if (index.status === "error") return <Shell><p className="error">Could not load the index: {index.error}</p></Shell>;
  const { meta, entries } = index.data;
  const fcData = fc.status === "ok" ? fc.data : null;
  const visible = applyFilters(entries, { ...state, q }, fcData);
  const nFc = fcData ? entries.filter((e) => fcData.entries[e.id]).length : 0;
  const nAreas = Object.keys(meta.areas).length;
  const grouped = state.sort === "area" && !q;

  const open = (id: string) => navigate({ pathname: `/p/${id}`, search: params.toString() });

  return (
    <Shell>
      <p className="count-line">
        {meta.n_entries} files · {nAreas} areas · compiled against Formal Conjectures{" "}
        <code>{meta.fc.commit.slice(0, 7)}</code> ({formatDate(meta.fc.commit_date)})
        {fcData && fcData.head_date && (
          <span className="muted"> · FC status checked at {formatDate(fcData.head_date)}</span>
        )}
      </p>
      <div className="list-layout">
        <aside className="list-side">
          <AreaSidebar meta={meta} area={state.area} subarea={state.subarea} total={entries.length} onSelect={(a, s) => update({ area: a, subarea: s })} />
        </aside>
        <div className="list-main">
          <div className="toolbar">
            <AreaSelect meta={meta} area={state.area} subarea={state.subarea} onSelect={(a, s) => update({ area: a, subarea: s })} />
            <input
              ref={searchRef}
              type="search"
              className="search"
              placeholder="Search names, statements, Lean identifiers…  ( / )"
              value={q}
              onChange={(e) => onSearch(e.target.value)}
              aria-label="Search"
            />
            <label className="toggle">
              <input type="checkbox" checked={state.hideFc} onChange={(e) => update({ hideFc: e.target.checked })} disabled={!fcData} />
              Hide files already in FC{nFc ? ` (${nFc})` : ""}
            </label>
            <label className="sort">
              Sort
              <select value={state.sort} onChange={(e) => update({ sort: e.target.value as ListState["sort"] })}>
                <option value="area">by area</option>
                <option value="title">title A–Z</option>
              </select>
            </label>
            <span className="result-count muted">
              {visible.length === entries.length ? `${entries.length} files` : `${visible.length} of ${entries.length} files`}
            </span>
          </div>
          {visible.length === 0 && <p className="muted empty">No files match.</p>}
          <ol className="rows">
            {visible.map((e, i) => {
              const prev = visible[i - 1];
              const header = grouped && (!prev || prev.area !== e.area || prev.subarea !== e.subarea);
              return (
                <Fragment key={e.id}>
                  {header && (
                    <li className="group-header" aria-hidden="true">
                      {capitalize(e.area)}
                      {e.subarea ? <> › {e.subarea}</> : null}{" "}
                      <span className="muted">
                        ({visible.filter((x) => x.area === e.area && x.subarea === e.subarea).length})
                      </span>
                    </li>
                  )}
                  <Row entry={e} fc={fcData?.entries[e.id]} showArea={!grouped} onOpen={() => open(e.id)} search={params.toString()} />
                </Fragment>
              );
            })}
          </ol>
        </div>
      </div>
    </Shell>
  );
}

function Row({ entry, fc, showArea, onOpen, search }: { entry: IndexEntry; fc: FcStatusEntry | undefined; showArea: boolean; onOpen: () => void; search: string }) {
  const statement = entry.statement !== entry.title ? entry.statement : "";
  return (
    <li
      className="row"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a")) return;
        onOpen();
      }}
    >
      <div className="row-line1">
        <Link to={{ pathname: `/p/${entry.id}`, search }} className="row-title">
          <MathText text={entry.title} />
        </Link>
        <EntryChips entry={entry} fc={fc} />
      </div>
      <div className="row-line2">
        <span className="row-statement">
          {showArea && (
            <span className="row-area">
              {capitalize(entry.area)}
              {entry.subarea ? ` › ${entry.subarea}` : ""}
              {statement ? " · " : ""}
            </span>
          )}
          {statement && <MathText text={statement} />}
        </span>
        <CountsLine entry={entry} />
      </div>
    </li>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopBar />
      <main className="page">{children}</main>
    </>
  );
}
