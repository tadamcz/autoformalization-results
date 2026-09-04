// A Lean code block with the file's own line numbers: highlighted once the
// client-side highlighter is ready, plain text until then.
import { useMemo } from "react";
import { highlightLean, useHighlighter } from "../highlight";

export function Code({ code, startLine, className }: { code: string; startLine?: number | null; className?: string }) {
  const ready = useHighlighter();
  const html = useMemo(() => (ready ? highlightLean(code) : null), [ready, code]);
  const style = useMemo(
    () => (startLine ? ({ counterReset: `line ${startLine - 1}` } as React.CSSProperties) : undefined),
    [startLine],
  );
  if (html !== null) {
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
