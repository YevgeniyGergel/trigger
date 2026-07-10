import Link from "next/link";
import { cn } from "@/lib/cn";
import { RippleMark } from "./ripple";

/** Фірмовий знак: хвилі + serif-вордмарк. */
export function Logo({
  href = "/dashboard",
  size = "md",
  className,
}: {
  href?: string | null;
  size?: "md" | "lg";
  className?: string;
}) {
  const content = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <RippleMark
        className={cn("text-sage-600", size === "lg" ? "size-9" : "size-7")}
      />
      <span
        className={cn(
          "font-display font-semibold tracking-tight text-ink",
          size === "lg" ? "text-2xl" : "text-lg"
        )}
      >
        Trigger
      </span>
    </span>
  );

  if (!href) return content;

  return (
    <Link href={href} className="rounded-md">
      {content}
    </Link>
  );
}
