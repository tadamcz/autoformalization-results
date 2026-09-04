// In-page navigation to a declaration that works in both views and survives
// the hash router: deep links are `#/p/<id>?at=<anchor>` (never a bare
// `#anchor`, which the router would read as a route).
import type { Block, Entry } from "../data/schema";
import type { View } from "./LeanFile";

export function blockAnchor(b: Block): string {
  return b.fq_name ? `decl-${b.fq_name.replace(/[^\w.]/g, "_")}` : `block-${b.i}`;
}

export function blockHref(entryId: string, search: string, b: Block): string {
  const params = new URLSearchParams(search);
  params.set("at", blockAnchor(b));
  return `#/p/${entryId}?${params.toString()}`;
}

export function withoutAt(search: string): string {
  const params = new URLSearchParams(search);
  params.delete("at");
  return params.toString();
}

function openAncestors(el: Element) {
  let node: Element | null = el.parentElement;
  while (node) {
    if (node instanceof HTMLDetailsElement && !node.open) node.open = true;
    node = node.parentElement;
  }
}

function flash(el: Element) {
  document.querySelectorAll(".jump-target").forEach((x) => x.classList.remove("jump-target"));
  el.classList.add("jump-target", "flash");
  window.setTimeout(() => el.classList.remove("flash"), 1600);
}

/** Scroll to a block: its element in the rendered view, its first line in the
 * Plain view. Returns false when nothing could be found yet. */
export function scrollToBlock(block: Block, view: View): boolean {
  if (view === "rendered") {
    const el = document.getElementById(blockAnchor(block));
    if (!el) return false;
    openAncestors(el);
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    flash(el);
    return true;
  }
  const line = block.code_line ?? block.line;
  const el = document.querySelector(`pre.whole-file .line:nth-child(${line})`);
  if (!el) return false;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  flash(el);
  return true;
}

export function findBlockByAnchor(entry: Entry, anchor: string): Block | undefined {
  return entry.blocks.find((b) => blockAnchor(b) === anchor);
}

/** Set the address bar to the block's deep link without a router navigation. */
export function rememberAnchor(entryId: string, search: string, b: Block) {
  history.replaceState(null, "", blockHref(entryId, search, b));
}
