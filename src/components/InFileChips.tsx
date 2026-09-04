import type { Block, Entry } from "../data/schema";
import { blockHref } from "./anchors";

// "In this file" chip row (≥3 declarations); click scrolls to the block in
// either view, the link itself is a deep link (#/p/<id>?at=…).
export function InFileChips({ entry, onJump, search }: { entry: Entry; onJump: (block: number) => void; search: string }) {
  const decls = entry.blocks.filter((b): b is Block & { fq_name: string } => b.kind === "decl" && !!b.fq_name && b.role !== "check");
  const checks = entry.blocks.filter((b) => b.kind === "decl" && b.role === "check").length;
  if (decls.length + (checks ? 1 : 0) < 3) return null;
  return (
    <nav className="infile" aria-label="In this file">
      <span className="muted">In this file:</span>
      {decls.map((b) => (
        <a
          key={b.i}
          href={blockHref(entry.id, search, b)}
          className={`chip infile-chip role-${b.role}`}
          onClick={(e) => {
            e.preventDefault();
            onJump(b.i);
          }}
          title={b.fq_name}
        >
          {b.fq_name.split(".").slice(-1)[0]}
        </a>
      ))}
      {checks > 0 && <span className="chip muted">{checks} sanity {checks === 1 ? "check" : "checks"}</span>}
    </nav>
  );
}
