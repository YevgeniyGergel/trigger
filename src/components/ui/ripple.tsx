import { cn } from "@/lib/cn";

/**
 * Фірмовий мотив Trigger — концентричні хвилі.
 * Тригер породжує хвилі; терапія повертає спокій.
 * Використовується як знак логотипа, декор фонів та порожніх станів.
 */
export function RippleMark({
  className,
  strokeWidth = 1.5,
  dot = true,
}: {
  className?: string;
  strokeWidth?: number;
  dot?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className={cn("size-6", className)}
    >
      {dot ? <circle cx="24" cy="24" r="4" fill="currentColor" /> : null}
      <circle
        cx="24"
        cy="24"
        r="11"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        opacity="0.55"
      />
      <circle
        cx="24"
        cy="24"
        r="18"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        opacity="0.3"
      />
      <circle
        cx="24"
        cy="24"
        r="23"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        opacity="0.14"
      />
    </svg>
  );
}

/**
 * Великі декоративні хвилі для фонів (auth, публічні сторінки).
 * Кладеться абсолютом, не перехоплює кліки.
 */
export function RippleBackdrop({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className
      )}
    >
      <RippleMark
        dot={false}
        strokeWidth={0.4}
        className="absolute -top-40 -right-40 size-[36rem] text-sage-300/40"
      />
      <RippleMark
        dot={false}
        strokeWidth={0.4}
        className="absolute -bottom-56 -left-56 size-[44rem] text-sand-300/50"
      />
    </div>
  );
}
