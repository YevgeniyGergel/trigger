import type { ReactNode } from "react";
import { signOut } from "@/lib/auth";
import { Logo } from "@/components/ui/logo";
import { CabinetNav } from "@/components/cabinet-nav";

export default function CabinetLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-sand-50/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-8 gap-y-2 px-6 py-3">
          <Logo />
          <div className="order-last w-full sm:order-none sm:w-auto sm:flex-1">
            <CabinetNav />
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="rounded-full px-3.5 py-1.5 text-sm text-ink-muted transition-colors hover:bg-sand-100 hover:text-ink"
            >
              Вийти
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        {children}
      </main>
      <footer className="border-t border-line py-6">
        <p className="text-center text-xs tracking-[0.18em] text-ink-faint uppercase">
          Trigger · Простір спокійної практики
        </p>
      </footer>
    </div>
  );
}
