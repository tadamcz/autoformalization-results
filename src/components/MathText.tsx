// Inline text with $…$ / $$…$$ runs rendered by KaTeX. Never throws: a bad
// formula falls back to its source text in a <code>.
import katex from "katex";
import { Fragment, useMemo } from "react";

// macros the sources' statements rely on (the Kourovka Notebook's \goth, \Z,
// \geq -> \geqslant …); set from index.json's meta before anything renders
let katexMacros: Record<string, string> = {};

// KaTeX output by (mode, expression): the list re-renders hundreds of rows per
// keystroke, and each formula's HTML never changes for given macros
const cache = new Map<string, string>();
const CACHE_MAX = 20000;

export function setKatexMacros(macros: Record<string, string>): void {
  katexMacros = macros;
  cache.clear();
}

function render(expr: string, display: boolean): string {
  const key = (display ? "D" : "I") + expr;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const html = renderUncached(expr, display);
  if (cache.size >= CACHE_MAX) cache.clear();
  cache.set(key, html);
  return html;
}

function renderUncached(expr: string, display: boolean): string {
  return katex.renderToString(expr, {
    displayMode: display,
    throwOnError: false,
    strict: "ignore",
    trust: false,
    output: "html",
    // KaTeX adds to this object when the input defines macros: pass a copy
    macros: { ...katexMacros },
  });
}

export function splitMath(text: string): Array<{ kind: "text" | "inline" | "display"; value: string }> {
  const parts: Array<{ kind: "text" | "inline" | "display"; value: string }> = [];
  let i = 0;
  let buf = "";
  while (i < text.length) {
    if (text.startsWith("$$", i)) {
      const j = text.indexOf("$$", i + 2);
      if (j !== -1) {
        if (buf) parts.push({ kind: "text", value: buf });
        buf = "";
        parts.push({ kind: "display", value: text.slice(i + 2, j) });
        i = j + 2;
        continue;
      }
    }
    if (text[i] === "$") {
      const j = text.indexOf("$", i + 1);
      if (j !== -1 && j > i + 1) {
        if (buf) parts.push({ kind: "text", value: buf });
        buf = "";
        parts.push({ kind: "inline", value: text.slice(i + 1, j) });
        i = j + 1;
        continue;
      }
    }
    buf += text[i];
    i += 1;
  }
  if (buf) parts.push({ kind: "text", value: buf });
  return parts;
}

export function MathText({ text, className }: { text: string; className?: string }) {
  const parts = useMemo(
    () => splitMath(text).map((p) => ({ ...p, html: p.kind === "text" ? null : render(p.value, p.kind === "display") })),
    [text],
  );
  return (
    <span className={className}>
      {parts.map((p, k) =>
        p.html === null ? (
          <Fragment key={k}>{p.value}</Fragment>
        ) : (
          <span key={k} className={p.kind === "display" ? "math-display" : "math-inline"} dangerouslySetInnerHTML={{ __html: p.html }} />
        ),
      )}
    </span>
  );
}
