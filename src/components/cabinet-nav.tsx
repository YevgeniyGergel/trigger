"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/dashboard", label: "Кабінет" },
  { href: "/clients", label: "Клієнти" },
  { href: "/schedule", label: "Розклад" },
  { href: "/sessions", label: "Сесії" },
  { href: "/settings", label: "Налаштування" },
];

export function CabinetNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 overflow-x-auto">
      {LINKS.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm transition-colors",
              active
                ? "bg-sage-100 font-medium text-sage-800"
                : "text-ink-muted hover:bg-sand-100 hover:text-ink"
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
