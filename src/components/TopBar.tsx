import { Link } from "react-router";

export const SITE_NAME = "Autoformalized conjectures";

export function TopBar({ children }: { children?: React.ReactNode }) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link to="/" className="brand">
          {SITE_NAME}
        </Link>
        <span className="topbar-desc">
          Lean 4 statements of open problems from Wikipedia's list and the Kourovka Notebook, written by an automated pipeline. Drafts for review.
        </span>
        <nav className="topbar-nav">
          {children}
          <Link to="/about">About</Link>
        </nav>
      </div>
    </header>
  );
}
