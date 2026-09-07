// The notions that two or more files defined for themselves (data/shared_defs.json):
// a list grouped by source, and one page per notion showing every variant with a
// language model's verdict against the representative. Every variant links to its
// declaration on the file's own page; those pages are not changed.
import { Fragment, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { orderedSources } from "../components/AreaSidebar";
import { Code } from "../components/Code";
import { Disclosure } from "../components/Disclosure";
import { Markdown } from "../components/Markdown";
import { MathText } from "../components/MathText";
import { TopBar } from "../components/TopBar";
import { declHref } from "../components/anchors";
import { capitalize, plural } from "../data/filters";
import { useIndex, useSharedDefs } from "../data/load";
import type { Meta, Relation, SharedDefGroup, SharedDefMember, SharedDefs } from "../data/schema";

const SAME: Relation[] = ["identical", "defeq", "equivalent"];

const RELATION_LABEL: Record<Relation, string> = {
  representative: "representative",
  identical: "identical",
  defeq: "definitionally equal",
  equivalent: "equivalent",
  different: "different notion",
  unclear: "unclear",
};

const RELATION_TITLE: Record<Relation, string> = {
  representative: "The variant the others are compared with",
  identical: "The model reads this as the same code up to whitespace and bound-variable names",
  defeq: "The model expects the two definitions to unfold to the same term (rfl)",
  equivalent: "The model judges the two definitions provably equivalent, by a real proof rather than by unfolding",
  different: "The model judges this a different notion; its reason follows",
  unclear: "The model could not decide from the code alone",
};

function relationCss(r: Relation): string {
  if (r === "representative") return "rel-representative";
  if (SAME.includes(r)) return "rel-same";
  return r === "different" ? "warn" : "muted";
}

function RelationChip({ relation }: { relation: Relation }) {
  return (
    <span className={`chip ${relationCss(relation)}`} title={RELATION_TITLE[relation]}>
      {RELATION_LABEL[relation]}
    </span>
  );
}

// which list section a group belongs to: one source, or both
function sectionOf(g: SharedDefGroup, meta: Meta): string {
  if (g.sources.length > 1) return "Both sources";
  const s = meta.sources[g.sources[0]];
  return `${s?.short_name ?? g.sources[0]} only`;
}

function sameCount(g: SharedDefGroup): number {
  return SAME.reduce((n, k) => n + (g.verdicts[k] ?? 0), 0);
}

function Shell({ children, narrow = true }: { children: React.ReactNode; narrow?: boolean }) {
  return (
    <>
      <TopBar />
      <main className={`page ${narrow ? "narrow" : ""} defs`}>{children}</main>
    </>
  );
}

function Loading({ index, sd }: { index: ReturnType<typeof useIndex>; sd: ReturnType<typeof useSharedDefs> }) {
  if (index.status === "error") return <p className="error">Could not load the index: {index.error}</p>;
  if (sd.status === "error") return <p className="error">Could not load the shared definitions: {sd.error}</p>;
  return <p className="muted">Loading…</p>;
}

// The caveat every page repeats: the verdicts are a model's reading, not Lean's.
function Caveat({ sd }: { sd: SharedDefs }) {
  return (
    <div className="status-line">
      <span className="status">
        The groupings and verdicts on this page are {sd.model.name}'s reading of the code. Nothing here was checked by Lean; each file's own page shows what compiled.
      </span>
    </div>
  );
}

export function SharedDefsPage() {
  const index = useIndex();
  const sd = useSharedDefs();
  useEffect(() => {
    document.title = "Shared definitions · Autoformalized conjectures";
  }, []);
  if (index.status !== "ok" || sd.status !== "ok") {
    return (
      <Shell>
        <Loading index={index} sd={sd} />
      </Shell>
    );
  }
  const meta = index.data.meta;
  const data = sd.data;
  // within a section: most variants judged the same notion first
  const bySame = (groups: SharedDefGroup[]) => [...groups].sort((a, b) => sameCount(b) - sameCount(a) || b.n_files - a.n_files || a.concept.localeCompare(b.concept));
  const sections: Array<{ id: string; title: string; groups: SharedDefGroup[] }> = [
    ...orderedSources(meta).map(([key, s]) => ({
      id: key,
      title: `${s.short_name} only`,
      groups: bySame(data.groups.filter((g) => g.sources.length === 1 && g.sources[0] === key)),
    })),
    { id: "both", title: "Both sources", groups: bySame(data.groups.filter((g) => g.sources.length > 1)) },
  ];
  return (
    <Shell>
      <h1>Shared definitions</h1>
      <p className="defs-intro">
        The files often had to define notions Mathlib lacks — a locally finite group, a planar graph, a knot's crossing number — and did so independently, each in its own
        file. These are the {data.groups.length} notions that {data.min_files} or more of the {data.n_files} files defined for themselves, out of {data.n_concepts} distinct
        notions across {data.n_definitions} definitions. {data.model.name} read every definition with its docstring and the formalizer's stated reason for adding it, named the
        notion it expresses, and then, for each notion below, judged whether each variant defines the same thing as one representative.
      </p>
      <Caveat sd={data} />
      <p className="toc">
        {sections.map((sec, i) => (
          <Fragment key={sec.id}>
            {i > 0 ? " · " : ""}
            <button className="linkish" onClick={() => document.getElementById(`section-${sec.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}>
              {sec.title}
            </button>{" "}
            <span className="muted">({sec.groups.length})</span>
          </Fragment>
        ))}
      </p>
      {sections.map(({ id: secId, title, groups }) => (
        <section key={secId} id={`section-${secId}`} className="defs-section">
          <h2>
            {title} <span className="muted">({groups.length})</span>
          </h2>
          {groups.length === 0 && <p className="muted">None.</p>}
          {groups.length > 0 && (
            <ol className="rows">
              {groups.map((g) => (
                <GroupRow key={g.id} group={g} />
              ))}
            </ol>
          )}
        </section>
      ))}
      <p>
        <Link to="/">← All files</Link>
      </p>
    </Shell>
  );
}

function GroupRow({ group: g }: { group: SharedDefGroup }) {
  const navigate = useNavigate();
  const names = [...new Set(g.members.map((m) => m.name))];
  const titles = [...new Set(g.members.map((m) => m.title))];
  const same = sameCount(g);
  return (
    <li
      className="row"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a")) return;
        navigate(`/defs/${g.id}`);
      }}
    >
      <div className="row-line1">
        <Link to={`/defs/${g.id}`} className="row-title">
          {capitalize(g.concept)}
        </Link>
        <span className="chips">
          <span className="chip">{plural(g.n_files, "file")}</span>
          {!g.adjudicated && <span className="chip muted">not adjudicated</span>}
          {same > 0 && (
            <span className="chip rel-same" title="Variants the model judged the same notion as the representative">
              {same} same
            </span>
          )}
        </span>
      </div>
      <div className="row-line2">
        <span className="row-statement">
          {names.map((n, i) => (
            <Fragment key={n}>
              {i > 0 ? ", " : ""}
              <code>{n}</code>
            </Fragment>
          ))}
          <span className="row-area">
            {" · in "}
            {titles.map((t, i) => (
              <Fragment key={t}>
                {i > 0 ? ", " : ""}
                <MathText text={t} />
              </Fragment>
            ))}
          </span>
        </span>
      </div>
    </li>
  );
}

export function SharedDefPage() {
  const { id } = useParams<{ id: string }>();
  const index = useIndex();
  const sd = useSharedDefs();
  const group = sd.status === "ok" ? sd.data.groups.find((g) => g.id === id) : undefined;
  useEffect(() => {
    document.title = `${group ? capitalize(group.concept) : "Shared definitions"} · Autoformalized conjectures`;
  }, [group]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);
  if (index.status !== "ok" || sd.status !== "ok") {
    return (
      <Shell>
        <Loading index={index} sd={sd} />
      </Shell>
    );
  }
  if (!group) {
    return (
      <Shell>
        <h1>Not found</h1>
        <p>
          <Link to="/defs">Back to the shared definitions</Link>
        </p>
      </Shell>
    );
  }
  const meta = index.data.meta;
  const same = sameCount(group);
  const others = group.members.length - (group.adjudicated ? 1 : 0);
  return (
    <Shell>
      <div className="crumbs">
        <Link to="/defs">Shared definitions</Link>
        {" › "}
        <span>{sectionOf(group, meta)}</span>
      </div>
      <h1>{capitalize(group.concept)}</h1>
      <p className="defs-intro">
        Defined independently in {plural(group.n_files, "file")}
        {group.adjudicated ? (
          <>
            . Of the {others} variants compared with the representative, the model judged {same} the same notion
            {(group.verdicts.different ?? 0) > 0 ? `, ${group.verdicts.different} different` : ""}
            {(group.verdicts.unclear ?? 0) > 0 ? `, ${group.verdicts.unclear} unclear` : ""}.
          </>
        ) : (
          ". The model grouped these variants but did not adjudicate them."
        )}
        {group.labels.length > 1 && (
          <>
            {" "}
            The model's labels for these definitions, merged here: <em>{group.labels.join("; ")}</em>.
          </>
        )}
      </p>
      <Caveat sd={sd.data} />
      {group.notes && (
        <div className="notes">
          <p className="verbatim-label muted">The model's note on the group:</p>
          <Markdown text={group.notes} />
        </div>
      )}
      <section>
        <h2>Definitions</h2>
        <div className="rendered">
          {group.members.map((m) => (
            <Member key={m.def_id} member={m} meta={meta} />
          ))}
        </div>
      </section>
      <p>
        <Link to="/defs">← All shared definitions</Link>
      </p>
    </Shell>
  );
}

function Member({ member: m, meta }: { member: SharedDefMember; meta: Meta }) {
  const isRep = m.relation === "representative";
  const href = declHref(m.entry_id, "", m.fq_name, m.block);
  return (
    <div className={`decl role-definition shared-member ${isRep ? "tinted" : ""}`} id={`m-${m.block}-${m.entry_id}`}>
      <div className="decl-head">
        {m.relation && <RelationChip relation={m.relation} />}
        <a href={href} title="This declaration on the file's page">
          <code className="fq">{m.fq_name}</code>
        </a>
        <span className="muted kind">{m.decl_kind}</span>
        <span className="muted member-where">
          in <Link to={`/p/${m.entry_id}`}><MathText text={m.title} /></Link> ({meta.sources[m.source]?.short_name ?? m.source}
          {m.area ? ` › ${capitalize(m.area)}` : ""})
        </span>
      </div>
      {m.why && <Markdown text={m.why} className="why" />}
      {isRep && m.meaning && <Markdown text={`*The model's reading:* ${m.meaning}`} className="why" />}
      {m.variables.length > 0 && <Code code={m.variables.join("\n")} className="prefix" />}
      {m.docstring && <Markdown text={m.docstring} className="docstring" />}
      <Code code={m.code} />
      {m.uses.length > 0 && (
        <p className="uses muted">
          uses:{" "}
          {m.uses.map((u, k) => (
            <span key={u.block}>
              {k > 0 ? ", " : ""}
              <a href={declHref(m.entry_id, "", u.fq_name, u.block)} title="This definition on the file's page">
                <code>{u.fq_name.split(".").slice(-1)[0]}</code>
              </a>
            </span>
          ))}
        </p>
      )}
      {m.closest_existing_considered && (
        <Disclosure summary={<span className="muted">Closest existing notion the formalizer considered</span>} className="def-notes">
          <Markdown text={m.closest_existing_considered} />
        </Disclosure>
      )}
    </div>
  );
}
