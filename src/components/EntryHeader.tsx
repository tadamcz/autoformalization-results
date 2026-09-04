import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import type { Entry, FcStatusEntry, Meta } from "../data/schema";
import { capitalize, formatDate, plural } from "../data/filters";

function basename(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1);
}

export function Crumbs({ entry, meta, search }: { entry: Entry; meta: Meta; search: string }) {
  const ams = [...new Set(entry.blocks.flatMap((b) => b.ams ?? []))].sort((a, b) => a - b);
  const areaParams = new URLSearchParams(search);
  areaParams.set("area", entry.area);
  if (entry.subarea) areaParams.set("sub", entry.subarea);
  else areaParams.delete("sub");
  return (
    <div className="crumbs">
      <Link to={{ pathname: "/", search: areaParams.toString() }}>
        {capitalize(entry.area)}
        {entry.subarea ? ` › ${entry.subarea}` : ""}
      </Link>
      {ams.length > 0 && (
        <span className="ams-chips">
          {ams.map((code) => (
            <span key={code} className="chip ams" title={meta.ams_subjects[String(code)] ?? `AMS ${code}`}>
              AMS {code}
            </span>
          ))}
        </span>
      )}
    </div>
  );
}

export function Actions({ entry, fc }: { entry: Entry; fc: FcStatusEntry | undefined }) {
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    // close the Check FC menu on a click elsewhere or Escape
    const onClick = (e: MouseEvent) => {
      const m = menuRef.current;
      if (m?.open && !m.contains(e.target as Node)) m.open = false;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && menuRef.current) menuRef.current.open = false;
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);
  const filename = basename(entry.fc.path);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(entry.lean);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Copy the file text:", entry.lean);
    }
  };
  const download = () => {
    const blob = new Blob([entry.lean], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const q = encodeURIComponent(`"${entry.title}"`);
  const codeSearch = `https://github.com/search?q=repo%3Agoogle-deepmind%2Fformal-conjectures+${q}&type=code`;
  const issueSearch = `https://github.com/google-deepmind/formal-conjectures/issues?q=${encodeURIComponent(entry.title)}`;
  return (
    <div className="actions">
      <button className="btn primary" onClick={copy}>
        {copied ? "Copied" : "Copy file"}
      </button>
      <button className="btn" onClick={download}>
        Download {filename}
      </button>
      <a className="btn link" href={entry.transcript_url} target="_blank" rel="noopener noreferrer" title="The pipeline's full transcript for this entry (Inspect log viewer)">
        Transcript
      </a>
      <details className="menu" ref={menuRef}>
        <summary className="btn">Check FC ▾</summary>
        <div className="menu-body">
          {fc && (
            <a href={fc.url} target="_blank" rel="noopener noreferrer">
              View FC file <span className="muted">({basename(fc.path)})</span>
            </a>
          )}
          <a href={codeSearch} target="_blank" rel="noopener noreferrer">
            Search FC code for the name
          </a>
          <a href={issueSearch} target="_blank" rel="noopener noreferrer">
            Search FC issues and PRs
          </a>
        </div>
      </details>
    </div>
  );
}

export function FileLine({ entry }: { entry: Entry }) {
  return (
    <p className="fileline muted">
      <code>{entry.fc.path}</code> · {plural(entry.lean_lines, "line")} ·{" "}
      <span className="confidence" title="The automated reviewer's confidence, from 0 to 1, that every statement in this file is faithful to the source. Files below the cut described on the About page are not shown.">
        Automated reviewer's confidence: {entry.confidence.toFixed(2)}
      </span>
    </p>
  );
}

// Below the Lean file: what it was compiled against.
export function CompileLine({ entry }: { entry: Entry }) {
  const c = entry.checks;
  const mathlib = entry.fc.mathlib_rev ? `, Mathlib ${entry.fc.mathlib_rev.slice(0, 7)}` : "";
  const lean = entry.fc.lean_toolchain.replace("leanprover/lean4:", "Lean 4 ").replace(/^Lean 4 v/, "Lean ");
  // "Compiles" already says no errors; only warnings other than sorry are worth a word
  const warnings =
    c.disallowed_warnings.length > 0
      ? ` with ${plural(c.disallowed_warnings.length, "warning")} besides sorry`
      : c.other_warnings.length > 0
        ? ` with ${plural(c.other_warnings.length, "allowed warning")} besides sorry`
        : "";
  return (
    <p className="compile-line muted">
      Compiles against Formal Conjectures <code>{entry.fc.commit.slice(0, 7)}</code> ({formatDate(entry.fc.commit_date)}; {lean}
      {mathlib}){warnings}.
    </p>
  );
}

export function PrevNext({ prev, next, search }: { prev: string | null; next: string | null; search: string }) {
  return (
    <span className="prevnext">
      {prev ? (
        <Link to={{ pathname: `/p/${prev}`, search }} title="Previous file in the current list">
          ‹ prev
        </Link>
      ) : (
        <span className="muted">‹ prev</span>
      )}
      <span className="muted"> · </span>
      {next ? (
        <Link to={{ pathname: `/p/${next}`, search }} title="Next file in the current list">
          next ›
        </Link>
      ) : (
        <span className="muted">next ›</span>
      )}
    </span>
  );
}
