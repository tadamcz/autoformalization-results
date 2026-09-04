// A Lean code block with the file's own line numbers: highlighted once the
// client-side highlighter is ready, plain text until then. URLs are links in
// both states.
import { useMemo } from "react";
import type { ThemedToken } from "shiki/core";
import { tokenizeLean, useHighlighter } from "../highlight";
import { linkify } from "./linkify";

function tokenStyle(t: ThemedToken): React.CSSProperties | undefined {
  const fs = t.fontStyle ?? 0;
  if (!t.color && !fs) return undefined;
  return {
    color: t.color,
    fontStyle: fs & 1 ? "italic" : undefined,
    fontWeight: fs & 2 ? "bold" : undefined,
    textDecoration: fs & 4 ? "underline" : undefined,
  };
}

export function Code({ code, startLine, className }: { code: string; startLine?: number | null; className?: string }) {
  const ready = useHighlighter();
  // one trailing newline is the end of the last line, not an extra empty line
  const text = code.endsWith("\n") ? code.slice(0, -1) : code;
  const tokens = useMemo(() => (ready ? tokenizeLean(text) : null), [ready, text]);
  const style = useMemo(
    () => (startLine ? ({ counterReset: `line ${startLine - 1}` } as React.CSSProperties) : undefined),
    [startLine],
  );
  const numbered = startLine ? "numbered" : "";
  if (tokens !== null) {
    return (
      <pre className={`code shiki ${numbered} ${className ?? ""}`} style={style}>
        <code>
          {tokens.map((line, i) => (
            <span className="line" key={i}>
              {line.map((t, j) => (
                <span key={j} style={tokenStyle(t)}>
                  {linkify(t.content)}
                </span>
              ))}
              {i < tokens.length - 1 ? "\n" : ""}
            </span>
          ))}
        </code>
      </pre>
    );
  }
  const lines = text.split("\n");
  return (
    <pre className={`code plain ${numbered} ${className ?? ""}`} style={style}>
      <code>
        {lines.map((l, i) => (
          <span className="line" key={i}>
            {linkify(l)}
            {i < lines.length - 1 ? "\n" : ""}
          </span>
        ))}
      </code>
    </pre>
  );
}
