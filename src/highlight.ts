// Client-side Lean highlighting: Shiki's JavaScript regex engine with the lean4
// grammar and the Formal Conjectures colour theme, loaded once on first use.
// The data files stay exactly what the exporter wrote; nothing is pre-rendered.
import { useEffect, useState } from "react";
import type { HighlighterCore } from "shiki/core";
import { FC_THEME } from "./lean-theme";

let highlighter: HighlighterCore | null = null;
let loading: Promise<HighlighterCore> | null = null;
const cache = new Map<string, string>();

export function loadHighlighter(): Promise<HighlighterCore> {
  if (highlighter) return Promise.resolve(highlighter);
  if (!loading) {
    loading = Promise.all([
      import("shiki/core"),
      import("shiki/engine/javascript"),
      import("shiki/langs/lean4.mjs"),
    ]).then(async ([core, engine, lean4]) => {
      highlighter = await core.createHighlighterCore({
        themes: [FC_THEME],
        langs: [lean4.default],
        engine: engine.createJavaScriptRegexEngine({ forgiving: true }),
      });
      return highlighter;
    });
  }
  return loading;
}

/** Inner HTML of the highlighted code (the <span class="line"> elements), or
 * null until the highlighter has loaded. */
export function highlightLean(code: string): string | null {
  if (!highlighter) return null;
  const hit = cache.get(code);
  if (hit !== undefined) return hit;
  const html = highlighter.codeToHtml(code, { lang: "lean4", theme: "fc" });
  const inner = html.replace(/^<pre[^>]*><code>/, "").replace(/<\/code><\/pre>$/, "");
  cache.set(code, inner);
  return inner;
}

export function useHighlighter(): boolean {
  const [ready, setReady] = useState(highlighter !== null);
  useEffect(() => {
    if (ready) return;
    let live = true;
    loadHighlighter().then(() => live && setReady(true), () => undefined);
    return () => {
      live = false;
    };
  }, [ready]);
  return ready;
}
