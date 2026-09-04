import type { Entry } from "../data/schema";
import { Markdown } from "./Markdown";

export function ReviewerNotes({ entry }: { entry: Entry }) {
  if (!entry.reviewer_notes.trim()) return null;
  return (
    <section className="reviewer-notes" id="notes">
      <h2>Notes from the automated reviewer</h2>
      <p className="muted small verbatim-label">Written by the model that chose and edited the final file. Attempt ids (c01–c08) refer to the table below.</p>
      <blockquote className="notes">
        <Markdown text={entry.reviewer_notes} />
      </blockquote>
    </section>
  );
}
