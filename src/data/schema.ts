// zod schemas for the exporter's JSON (autoformalization/results_site/schema.py
// is the producer; scripts/check.ts validates data/** against these at build).
import { z } from "zod";

export const SCHEMA_VERSION = 2; // 2: confidence + lean_lines on entries and index rows

const nullableString = z.string().nullable();

export const Counts = z.object({
  open: z.number(),
  known: z.number(),
  defs: z.number(),
  checks: z.number(),
  additional: z.number(),
  omitted: z.number(),
  dropped: z.number(),
});

export const Outcome = z.object({
  kind: z.enum(["complete", "partial"]),
  statements_kept: z.number(),
  statements_total: z.number(),
  parts_dropped: z.number(),
});

export const IndexEntry = z.object({
  id: z.string(),
  title: z.string(),
  statement: z.string(),
  area: z.string(),
  subarea: nullableString,
  counts: Counts,
  outcome: Outcome,
  confidence: z.number(),
  lean_lines: z.number(),
  ams: z.array(z.number()),
  flags: z.array(z.string()),
  fc_path: z.string(),
  search: z.string(),
});

const ModelRef = z.object({ id: z.string(), name: z.string() });

export const Meta = z.object({
  schema_version: z.literal(SCHEMA_VERSION),
  run_id: z.string(),
  log_name: z.string(),
  generated_at: z.string(),
  min_confidence: z.number(),
  n_entries: z.number(),
  outcomes: z.record(z.string(), z.number()),
  areas: z.record(
    z.string(),
    z.object({ count: z.number(), subareas: z.record(z.string(), z.number()) }),
  ),
  fc: z.object({
    commit: z.string(),
    commit_date: z.string(),
    lean_toolchain: z.string(),
    mathlib_rev: nullableString,
  }),
  fc_repo_url: z.string(),
  models: z.object({
    generators: z.array(ModelRef),
    adjudicator: ModelRef,
    decomposer: ModelRef,
    prover: ModelRef,
  }),
  attempts_per_entry: z.number(),
  prover_settled_confidences: z.array(z.number()),
  probe_budget_minutes: z.number(),
  transcript_base: z.string(),
  wikipedia_snapshot: nullableString,
  list_url: z.string(),
  ams_subjects: z.record(z.string(), z.string()),
});

export const IndexFile = z.object({ meta: Meta, entries: z.array(IndexEntry) });

export const Justification = z.object({
  name: z.string(),
  why_needed: z.string(),
  closest_existing_considered: z.string(),
  from_attempt: z.string(),
});

export const BlockKind = z.enum(["header", "module_doc", "comment", "command", "decl"]);
export const Role = z.enum([
  "statement",
  "additional_statement",
  "definition",
  "known_result",
  "check",
  "other",
]);

export const Block = z.object({
  i: z.number(),
  kind: BlockKind,
  text: z.string(),
  line: z.number(),
  command: nullableString.optional(),
  command_arg: nullableString.optional(),
  modifiers: z.array(z.string()).optional(),
  decl_kind: z.string().optional(),
  name: nullableString.optional(),
  fq_name: nullableString.optional(),
  leading_comment: nullableString.optional(),
  prefix: nullableString.optional(),
  docstring: nullableString.optional(),
  attributes: z.array(z.string()).optional(),
  code: z.string().optional(),
  code_line: z.number().nullable().optional(),
  category: nullableString.optional(),
  ams: z.array(z.number()).optional(),
  role: Role.optional(),
  claim: z.number().nullable().optional(),
  justification: Justification.nullable().optional(),
  uses: z.array(z.number()).optional(),
  used_by: z.array(z.number()).optional(),
});

export const Location = z.object({
  location: z.enum(["statement", "article", "unlocated"]),
  match: nullableString,
  start: z.number().nullable(),
  end: z.number().nullable(),
  ratio: z.number().nullable(),
});

export const Claim = z.object({
  position: z.number(),
  kind: z.enum(["stated", "omitted", "not_stated"]),
  slot: nullableString,
  text_span: z.string(),
  source_text: z.string(),
  location: Location,
  decomposer_note: z.string(),
  reviewer_why: nullableString,
  winner_attempt: nullableString,
  winner_model: nullableString,
  block: z.number().nullable(),
  category: nullableString,
});

export const AttemptSummary = z.object({
  cid: z.string(),
  model: nullableString,
  model_name: z.string(),
  compile_ok: z.boolean(),
  bailed: z.boolean(),
  slot_outcomes: z.record(z.string(), z.string()),
  confidence: z.number().nullable(),
});

export const Entry = z.object({
  schema_version: z.literal(SCHEMA_VERSION),
  id: z.string(),
  uuid: z.string(),
  title: z.string(),
  title_source: z.string(),
  record_title: z.string(),
  article_title: nullableString,
  statement: z.string(),
  statement_segments: z.array(z.object({ text: z.string(), ref: z.number().nullable() })),
  context: nullableString,
  area: z.string(),
  subarea: nullableString,
  tags: z.array(z.string()),
  list_url: z.string(),
  reference_url: z.string(),
  article_url: z.string(),
  fc: z.object({
    path: z.string(),
    lean_namespace: z.string(),
    slot_prefix: z.string(),
    commit: z.string(),
    commit_date: z.string(),
    lean_toolchain: z.string(),
    mathlib_rev: nullableString,
  }),
  outcome: Outcome,
  // the automated reviewer's confidence (0–1) that every statement in the file is faithful
  confidence: z.number(),
  lean_lines: z.number(),
  lean: z.string(),
  blocks: z.array(Block),
  claims: z.array(Claim),
  reviewer_notes: z.string(),
  modeling_decisions: z.array(
    z.object({ attempt: z.string(), model: z.string(), items: z.array(z.string()) }),
  ),
  decomposition_objections: z.array(
    z.object({ attempt: z.string(), model: z.string(), text: z.string() }),
  ),
  checks: z.object({
    compiled: z.boolean(),
    clean: z.boolean(),
    sorry_lines: z.array(z.number().nullable()),
    other_warnings: z.array(z.string()),
    disallowed_warnings: z.array(z.object({ line: z.number().nullable(), text: nullableString })),
    probe: z.object({
      ran: z.boolean(),
      attempts: z.number().nullable(),
      limit: nullableString,
      budget_minutes: z.number(),
    }),
  }),
  attempts: z.object({
    total: z.number(),
    compiled: z.number(),
    bailed: z.number(),
    chosen: z.record(z.string(), nullableString),
    main: nullableString,
    list: z.array(AttemptSummary),
  }),
  transcript_url: z.string(),
  references: z.array(z.object({ id: z.string(), title: z.string(), url: z.string() })),
  flags: z.array(z.string()),
  counts: Counts,
});

export const AltAttempt = z.object({
  cid: z.string(),
  model: nullableString,
  model_name: z.string(),
  compile_ok: z.boolean(),
  bailed: z.boolean(),
  confidence: z.number().nullable(),
  code: nullableString,
  compile_errors: z.array(z.object({ line: z.number().nullable(), text: z.string() })),
  per_slot: z.record(z.string(), z.object({ outcome: z.string(), why: z.string() })),
  new_definitions: z.array(z.record(z.string(), z.unknown())),
  modeling_decisions: z.array(z.string()),
  decomposition_objections: z.string(),
  statement_blocks: z.record(z.string(), z.string()),
  split_error: nullableString,
});

export const Alts = z.object({
  id: z.string(),
  chosen: z.record(z.string(), nullableString),
  main_attempt: nullableString,
  attempts: z.array(AltAttempt),
});

export const FcStatusEntry = z.object({
  path: z.string(),
  url: z.string(),
  added: nullableString,
  match: z.string(),
});

export const FcStatus = z.object({
  generated_at: z.string(),
  pin: z.string(),
  ref: z.string(),
  head: z.string(),
  head_date: z.string(),
  added_files: z.array(
    z.object({
      path: z.string(),
      added: nullableString,
      wikipedia: z.array(z.string()),
      arxiv: z.array(z.string()),
      url: z.string(),
    }),
  ),
  entries: z.record(z.string(), FcStatusEntry),
  path_collisions: z.record(z.string(), z.string()),
  ambiguous: z.array(z.string()),
  shared_files: z.record(z.string(), z.array(z.string())),
});

export type Counts = z.infer<typeof Counts>;
export type Outcome = z.infer<typeof Outcome>;
export type IndexEntry = z.infer<typeof IndexEntry>;
export type Meta = z.infer<typeof Meta>;
export type IndexFile = z.infer<typeof IndexFile>;
export type Block = z.infer<typeof Block>;
export type Claim = z.infer<typeof Claim>;
export type Entry = z.infer<typeof Entry>;
export type Alts = z.infer<typeof Alts>;
export type AltAttempt = z.infer<typeof AltAttempt>;
export type FcStatus = z.infer<typeof FcStatus>;
export type FcStatusEntry = z.infer<typeof FcStatusEntry>;
export type Justification = z.infer<typeof Justification>;
