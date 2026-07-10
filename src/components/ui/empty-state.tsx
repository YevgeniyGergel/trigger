import type { ReactNode } from "react";
import { RippleMark } from "./ripple";

/** Порожній стан з фірмовим мотивом хвиль. */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-card border border-dashed border-sand-300 bg-sand-100/50 px-6 py-14 text-center">
      <RippleMark className="size-12 text-sage-400" />
      <p className="mt-4 font-display text-lg text-ink">{title}</p>
      {description ? (
        <p className="mt-1.5 max-w-sm text-sm text-ink-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
