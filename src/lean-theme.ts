// The Formal Conjectures website's Lean colours (site/src/css/lean-syntax.css in
// google-deepmind/formal-conjectures#5235, adapted there from the Hex manual),
// expressed as a Shiki theme over the lean4 TextMate grammar so our code looks
// like FC's source pages: green keywords, brown declaration names, orange sorts
// and literals, green comments (doc comments upright), cream background.
import type { ThemeRegistration } from "shiki/core";

export const FC_PALETTE = {
  background: "#fef8f0",
  text: "#3a3a3a",
  keyword: "#2d6a4f",
  declaration: "#5a4a3a",
  variable: "#3a3a3a",
  type: "#c05630",
  string: "#c05630",
  number: "#c05630",
  comment: "#40916c",
  punctuation: "#8a7a5a",
} as const;

export const FC_THEME: ThemeRegistration = {
  name: "fc",
  type: "light",
  colors: {
    "editor.background": FC_PALETTE.background,
    "editor.foreground": FC_PALETTE.text,
  },
  settings: [
    { settings: { foreground: FC_PALETTE.text, background: FC_PALETTE.background } },
    {
      scope: [
        "keyword.other.command.lean4",
        "keyword.other.definitioncommand.lean4",
        "keyword.other.lean4",
        "storage.modifier.lean4",
        "constant.language.lean4",
      ],
      settings: { foreground: FC_PALETTE.keyword, fontStyle: "bold" },
    },
    {
      scope: ["entity.name.function.lean4", "entity.name.lean4"],
      settings: { foreground: FC_PALETTE.declaration },
    },
    { scope: ["storage.type.lean4"], settings: { foreground: FC_PALETTE.type } },
    {
      scope: [
        "string.quoted.double.lean4",
        "string.quoted.single.lean4",
        "string.interpolated.lean4",
        "constant.character.escape.lean4",
      ],
      settings: { foreground: FC_PALETTE.string },
    },
    { scope: ["constant.numeric.lean4"], settings: { foreground: FC_PALETTE.number } },
    {
      scope: ["comment.block.lean4", "comment.line.double-dash.lean4"],
      settings: { foreground: FC_PALETTE.comment, fontStyle: "italic" },
    },
    {
      scope: ["comment.block.documentation.lean4"],
      settings: { foreground: FC_PALETTE.comment, fontStyle: "" },
    },
  ],
};
