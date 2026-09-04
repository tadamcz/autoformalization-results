import { Fragment, memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { AreaSelect, AreaSidebar, orderedSources } from "../components/AreaSidebar";
import { CountsLine, EntryChips } from "../components/Chips";
import { MathText } from "../components/MathText";
import { TopBar } from "../components/TopBar";
import {
  LINE_STEPS,
  NO_FILTERS,
  applyFilters,
  capitalize,
  distinctConfidences,
  hasFilters,
  parseState,
  serializeState,
  type DefsFilter,
  type ListState,
} from "../data/filters";
import { useFcStatus, useIndex } from "../data/load";
import type { FcStatusEntry, IndexEntry } from "../data/schema";

export function ListPage() {
  const index = useIndex();
  const fc = useFcStatus();
  const [params, setParams] = useSearchParams();
  const state = useMemo(() => parseState(params), [params]);
  const searchRef = useRef<HTMLInputElement>(null);

  // derived from the URL as it is when the update lands, not from the render
  // that scheduled it (the search debounce fires later)
  const update = useCallback(
    (patch: Partial<ListState>) => {
      setParams((prev) => serializeState({ ...parseState(prev), ...patch }), { replace: true });
    },
    [setParams],
  );

  // The search box keeps its own immediate value; the URL follows with a short
  // delay. The URL is copied back into the box only when it changed elsewhere
  // (back/forward, Clear) — never when it merely caught up with the box, which
  // would overwrite what was typed in the meantime.
  const [q, setQ] = useState(state.q);
  const pushed = useRef(state.q);
  const debounce = useRef<number | null>(null);
  useEffect(() => {
    if (state.q !== pushed.current) {
      pushed.current = state.q;
      setQ(state.q);
    }
  }, [state.q]);
  useEffect(() => () => window.clearTimeout(debounce.current ?? undefined), []);
  const onSearch = (value: string) => {
    setQ(value);
    if (debounce.current) window.clearTimeout(debounce.current);
    debounce.current = window.setTimeout(() => {
      pushed.current = value;
      update({ q: value });
    }, 150);
  };
  // filtering follows the box at low priority so typing never waits for the list
  const deferredQ = useDeferredValue(q);

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
  const visible = applyFilters(entries, { ...state, q: deferredQ }, fcData);
  const nFc = fcData ? entries.filter((e) => fcData.entries[e.id]).length : 0;
  const grouped = state.sort === "area" && !q;
  const select = (source: string | null, area: string | null, subarea: string | null) => update({ source, area, subarea });
  // group headers and row labels name the source unless one is selected
  const where = (e: IndexEntry) =>
    (state.source ? "" : `${meta.sources[e.source]?.short_name ?? e.source} › `) + capitalize(e.area) + (e.subarea ? ` › ${e.subarea}` : "");

  const search = params.toString();

  return (
    <Shell>
      <p className="count-line">
        {meta.n_entries} files ·{" "}
        {orderedSources(meta)
          .map(([, s]) => `${s.n_entries} from the ${s.short_name}`)
          .join(" · ")}
      </p>
      <div className="list-layout">
        <aside className="list-side">
          <AreaSidebar meta={meta} source={state.source} area={state.area} subarea={state.subarea} total={entries.length} onSelect={select} />
        </aside>
        <div className="list-main">
          <div className="toolbar">
            <AreaSelect meta={meta} source={state.source} area={state.area} subarea={state.subarea} onSelect={select} />
            <input
              ref={searchRef}
              type="search"
              className="search"
              placeholder="Search names, statements, Lean identifiers…  ( / )"
              value={q}
              onChange={(e) => onSearch(e.target.value)}
              aria-label="Search"
            />
            <label className="sort">
              Sort
              <select value={state.sort} onChange={(e) => update({ sort: e.target.value as ListState["sort"] })}>
                <option value="area">by source and area</option>
                <option value="title">title A–Z</option>
              </select>
            </label>
            <span className="result-count muted">
              {visible.length === entries.length ? `${entries.length} files` : `${visible.length} of ${entries.length} files`}
            </span>
          </div>
          <Filters state={state} entries={entries} onChange={update} nFc={nFc} fcReady={!!fcData} />
          {visible.length === 0 && <p className="muted empty">No files match.</p>}
          <ol className="rows">
            {visible.map((e, i) => {
              const prev = visible[i - 1];
              const header = grouped && (!prev || prev.source !== e.source || prev.area !== e.area || prev.subarea !== e.subarea);
              return (
                <Fragment key={e.id}>
                  {header && (
                    <li className="group-header" aria-hidden="true">
                      {where(e)}{" "}
                      <span className="muted">
                        ({visible.filter((x) => x.source === e.source && x.area === e.area && x.subarea === e.subarea).length})
                      </span>
                    </li>
                  )}
                  <Row entry={e} fc={fcData?.entries[e.id]} where={grouped ? null : where(e)} search={search} />
                </Fragment>
              );
            })}
          </ol>
        </div>
      </div>
    </Shell>
  );
}

// Bounds on the reviewer's confidence and the file length, whether the file adds
// definitions, and the FC toggle.
function Filters({
  state,
  entries,
  onChange,
  nFc,
  fcReady,
}: {
  state: ListState;
  entries: IndexEntry[];
  onChange: (patch: Partial<ListState>) => void;
  nFc: number;
  fcReady: boolean;
}) {
  const confidences = useMemo(() => distinctConfidences(entries), [entries]);
  return (
    <div className="filters" role="group" aria-label="Filters">
      <span className="filter">
        Confidence
        <Bound value={state.confMin} options={confidences} empty="min" label="Lowest reviewer confidence to show" fmt={(n) => n.toFixed(2)} onChange={(v) => onChange({ confMin: v })} />
        <span className="muted">–</span>
        <Bound value={state.confMax} options={confidences} empty="max" label="Highest reviewer confidence to show" fmt={(n) => n.toFixed(2)} onChange={(v) => onChange({ confMax: v })} />
      </span>
      <span className="filter">
        Length
        <Bound value={state.linesMin} options={LINE_STEPS} empty="min" label="Shortest file to show, in lines" fmt={String} onChange={(v) => onChange({ linesMin: v })} />
        <span className="muted">–</span>
        <Bound value={state.linesMax} options={LINE_STEPS} empty="max" label="Longest file to show, in lines" fmt={String} onChange={(v) => onChange({ linesMax: v })} />
        lines
      </span>
      <label className="filter">
        New definitions
        <select value={state.defs} onChange={(e) => onChange({ defs: e.target.value as DefsFilter })}>
          <option value="any">any</option>
          <option value="none">none</option>
          <option value="some">1 or more</option>
        </select>
      </label>
      <label className="filter toggle">
        <input type="checkbox" checked={state.hideFc} onChange={(e) => onChange({ hideFc: e.target.checked })} disabled={!fcReady} />
        Hide files already in FC{nFc ? ` (${nFc})` : ""}
      </label>
      {hasFilters(state) && (
        <button className="clear" onClick={() => onChange(NO_FILTERS)}>
          Clear
        </button>
      )}
    </div>
  );
}

function Bound({
  value,
  options,
  empty,
  label,
  fmt,
  onChange,
}: {
  value: number | null;
  options: number[];
  empty: string;
  label: string;
  fmt: (n: number) => string;
  onChange: (v: number | null) => void;
}) {
  // a value that arrived in the URL but is not one of the offered steps stays selectable
  const opts = value !== null && !options.includes(value) ? [...options, value].sort((a, b) => a - b) : options;
  return (
    <select value={value === null ? "" : String(value)} aria-label={label} title={label} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}>
      <option value="">{empty}</option>
      {opts.map((v) => (
        <option key={v} value={String(v)}>
          {fmt(v)}
        </option>
      ))}
    </select>
  );
}

// Memoised: a keystroke re-filters the list, and rows whose props did not
// change (same entry object, FC status, label and URL) must not re-render.
const Row = memo(function Row({ entry, fc, where, search }: { entry: IndexEntry; fc: FcStatusEntry | undefined; where: string | null; search: string }) {
  const navigate = useNavigate();
  const statement = entry.statement !== entry.title ? entry.statement : "";
  return (
    <li
      className="row"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a")) return;
        navigate({ pathname: `/p/${entry.id}`, search });
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
          {where && (
            <span className="row-area">
              {where}
              {statement ? " · " : ""}
            </span>
          )}
          {statement && <MathText text={statement} />}
        </span>
        <CountsLine entry={entry} />
      </div>
    </li>
  );
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopBar />
      <main className="page">{children}</main>
    </>
  );
}
