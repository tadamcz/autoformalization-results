// A highlighted code block (Shiki HTML from scripts/highlight.mjs) with the
// file's own line numbers, or a plain <pre> when no HTML is available.
import { useMemo } from "react";

export function Code({ html, code, startLine, className }: { html?: string | null; code: string; startLine?: number | null; className?: string }) {
  const style = useMemo(
    () => (startLine ? ({ counterReset: `line ${startLine - 1}` } as React.CSSProperties) : undefined),
    [startLine],
  );
  if (html) {
    return (
      <pre className={`code shiki ${startLine ? "numbered" : ""} ${className ?? ""}`} style={style}>
        <code dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    );
  }
  const lines = code.split("\n");
  return (
    <pre className={`code plain ${startLine ? "numbered" : ""} ${className ?? ""}`} style={style}>
      <code>
        {lines.map((l, i) => (
          <span className="line" key={i}>
            {l}
            {i < lines.length - 1 ? "\n" : ""}
          </span>
        ))}
      </code>
    </pre>
  );
}
