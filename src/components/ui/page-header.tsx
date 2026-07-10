import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Дрібна uppercase-«брова» з розрядкою — фірмовий маркер секцій. */
export function Eyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-[11px] font-semibold uppercase tracking-[0.18em] text-sage-600",
        className
      )}
    >
      {children}
    </p>
  );
}

/** Заголовок сторінки: брова + serif-тайтл + дії праворуч. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow ? <Eyebrow className="mb-2">{eyebrow}</Eyebrow> : null}
        <h1 className="font-display text-3xl font-medium tracking-tight text-ink">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-xl text-sm text-ink-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** Заголовок секції всередині сторінки. */
export function SectionTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={cn(
        "font-display text-xl font-medium tracking-tight text-ink",
        className
      )}
    >
      {children}
    </h2>
  );
}
