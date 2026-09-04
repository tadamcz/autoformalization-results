// An inline term with a tooltip shown on hover and on keyboard focus (CSS
// only; the tooltip text is in the DOM for screen readers via aria-describedby).
import { useId, type ReactNode } from "react";

export function Tip({ children, tip, className }: { children: ReactNode; tip: ReactNode; className?: string }) {
  const id = useId();
  return (
    <span className={`tip ${className ?? ""}`} tabIndex={0} aria-describedby={id}>
      {children}
      <span className="tip-body" role="tooltip" id={id}>
        {tip}
      </span>
    </span>
  );
}
