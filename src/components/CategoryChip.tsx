// FC's own words and colours for the @[category] attribute.
const META: Record<string, { label: string; css: string }> = {
  "research open": { label: "research open", css: "cat-open" },
  "research solved": { label: "research solved", css: "cat-solved" },
  textbook: { label: "textbook", css: "cat-textbook" },
  test: { label: "test", css: "cat-test" },
  API: { label: "API", css: "cat-api" },
};

export function CategoryChip({ category, outlined = false, title }: { category: string | null | undefined; outlined?: boolean; title?: string }) {
  if (!category) return null;
  const m = META[category] ?? { label: category, css: "cat-unknown" };
  return (
    <span className={`chip cat ${m.css} ${outlined ? "outlined" : ""}`} title={title}>
      {m.label}
    </span>
  );
}
