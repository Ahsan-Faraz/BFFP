import type { ReactNode } from "react";

const VARIANTS = {
  trap: { label: "Interview trap", icon: "!", className: "callout-trap" },
} as const;

export type CalloutType = keyof typeof VARIANTS;

export function Callout({ type, title, children }: { type: CalloutType; title?: string; children: ReactNode }) {
  const v = VARIANTS[type];
  return (
    <aside className={`callout ${v.className}`}>
      <p className="callout-label">
        <span aria-hidden="true" className="callout-icon">
          {v.icon}
        </span>
        {v.label}
        {title ? <span className="callout-title"> · {title}</span> : null}
      </p>
      <div className="callout-body">{children}</div>
    </aside>
  );
}

// What you'd say in an interview if asked about this concept.
export function Summary({ children }: { children: ReactNode }) {
  return (
    <div className="summary">
      <span className="summary-label">Interview answer</span>
      <div className="summary-body">{children}</div>
    </div>
  );
}
