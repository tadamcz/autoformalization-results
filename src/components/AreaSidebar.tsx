import type { Meta } from "../data/schema";
import { capitalize } from "../data/filters";

interface Props {
  meta: Meta;
  area: string | null;
  subarea: string | null;
  onSelect: (area: string | null, subarea: string | null) => void;
  total: number;
}

export function AreaSidebar({ meta, area, subarea, onSelect, total }: Props) {
  const areas = Object.entries(meta.areas).sort(([a], [b]) => a.localeCompare(b));
  return (
    <nav className="sidebar" aria-label="Areas">
      <ul className="area-list">
        <li>
          <button className={`area ${area === null ? "active" : ""}`} onClick={() => onSelect(null, null)}>
            <span>All areas</span>
            <span className="count">{total}</span>
          </button>
        </li>
        {areas.map(([name, info]) => {
          const subs = Object.entries(info.subareas).sort(([a], [b]) => a.localeCompare(b));
          const open = area === name;
          return (
            <li key={name}>
              <button className={`area ${open && !subarea ? "active" : ""}`} onClick={() => onSelect(name, null)} aria-expanded={open}>
                <span>{capitalize(name)}</span>
                <span className="count">{info.count}</span>
              </button>
              {open && subs.length > 0 && (
                <ul className="subarea-list">
                  {subs.map(([sub, n]) => (
                    <li key={sub}>
                      <button className={`subarea ${subarea === sub ? "active" : ""}`} onClick={() => onSelect(name, subarea === sub ? null : sub)}>
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
    </nav>
  );
}

// Below ~900px the sidebar becomes a select.
export function AreaSelect({ meta, area, subarea, onSelect }: Omit<Props, "total">) {
  const value = area ? (subarea ? `${area}|${subarea}` : area) : "";
  return (
    <select
      className="area-select"
      value={value}
      aria-label="Area"
      onChange={(e) => {
        const v = e.target.value;
        if (!v) return onSelect(null, null);
        const [a, s] = v.split("|");
        onSelect(a, s ?? null);
      }}
    >
      <option value="">All areas</option>
      {Object.entries(meta.areas)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, info]) => (
          <optgroup key={name} label={`${capitalize(name)} (${info.count})`}>
            <option value={name}>All {name}</option>
            {Object.entries(info.subareas)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([sub, n]) => (
                <option key={sub} value={`${name}|${sub}`}>
                  {capitalize(sub)} ({n})
                </option>
              ))}
          </optgroup>
        ))}
    </select>
  );
}
