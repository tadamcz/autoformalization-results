import type { Meta, SourceMeta } from "../data/schema";
import { capitalize, compareNatural } from "../data/filters";

interface Props {
  meta: Meta;
  source: string | null;
  area: string | null;
  subarea: string | null;
  onSelect: (source: string | null, area: string | null, subarea: string | null) => void;
  total: number;
}

// index.json is written with sorted keys, so sources and areas are ordered here
export function orderedSources(meta: Meta): Array<[string, SourceMeta]> {
  return Object.entries(meta.sources).sort(([, a], [, b]) => a.order - b.order);
}

export function orderedAreas(s: SourceMeta): Array<[string, { count: number; subareas: Record<string, number> }]> {
  return Object.entries(s.areas).sort(([a], [b]) => compareNatural(a, b));
}

// One section per source (its header filters to the source), the source's
// areas beneath; an open area shows its subareas.
export function AreaSidebar({ meta, source, area, subarea, onSelect, total }: Props) {
  return (
    <nav className="sidebar" aria-label="Sources and areas">
      <ul className="area-list">
        <li>
          <button className={`area ${source === null && area === null ? "active" : ""}`} onClick={() => onSelect(null, null, null)}>
            <span>All files</span>
            <span className="count">{total}</span>
          </button>
        </li>
        {orderedSources(meta).map(([key, s]) => {
          const inSource = source === key;
          return (
            <li key={key} className="source-section">
              <button className={`area source ${inSource && !area ? "active" : ""}`} onClick={() => onSelect(key, null, null)}>
                <span>{s.short_name}</span>
                <span className="count">{s.n_entries}</span>
              </button>
              <ul className="area-sublist">
                {orderedAreas(s).map(([name, info]) => {
                  const subs = Object.entries(info.subareas).sort(([a], [b]) => compareNatural(a, b));
                  const open = inSource && area === name;
                  return (
                    <li key={name}>
                      <button className={`area ${open && !subarea ? "active" : ""}`} onClick={() => onSelect(key, name, null)} aria-expanded={open}>
                        <span>{capitalize(name)}</span>
                        <span className="count">{info.count}</span>
                      </button>
                      {open && subs.length > 0 && (
                        <ul className="subarea-list">
                          {subs.map(([sub, n]) => (
                            <li key={sub}>
                              <button className={`subarea ${subarea === sub ? "active" : ""}`} onClick={() => onSelect(key, name, subarea === sub ? null : sub)}>
                                <span>{capitalize(sub)}</span>
                                <span className="count">{n}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// Below ~900px the sidebar becomes a select.
export function AreaSelect({ meta, source, area, subarea, onSelect }: Omit<Props, "total">) {
  const value = source ? [source, area ?? "", subarea ?? ""].join("|") : "";
  return (
    <select
      className="area-select"
      value={value}
      aria-label="Source and area"
      onChange={(e) => {
        const v = e.target.value;
        if (!v) return onSelect(null, null, null);
        const [src, a, s] = v.split("|");
        onSelect(src, a || null, s || null);
      }}
    >
      <option value="">All files</option>
      {orderedSources(meta).map(([key, s]) => (
        <optgroup key={key} label={`${s.short_name} (${s.n_entries})`}>
          <option value={`${key}||`}>All {s.short_name}</option>
          {orderedAreas(s).flatMap(([name, info]) => [
            <option key={name} value={`${key}|${name}|`}>
              {capitalize(name)} ({info.count})
            </option>,
            ...Object.entries(info.subareas)
              .sort(([a], [b]) => compareNatural(a, b))
              .map(([sub, n]) => (
                <option key={`${name}|${sub}`} value={`${key}|${name}|${sub}`}>
                  {"  "}{capitalize(name)} › {capitalize(sub)} ({n})
                </option>
              )),
          ])}
        </optgroup>
      ))}
    </select>
  );
}
