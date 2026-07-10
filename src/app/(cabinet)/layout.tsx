import type { ReactNode } from "react";
import Link from "next/link";
import { signOut } from "@/lib/auth";

export default function CabinetLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="flex items-center justify-between border-b bg-white px-6 py-4">
        <div className="flex items-center gap-6">
          <span className="font-semibold">Trigger</span>
          <Link href="/dashboard" className="text-sm text-gray-600 hover:text-black">
            Кабінет
          </Link>
          <Link href="/settings" className="text-sm text-gray-600 hover:text-black">
            Налаштування
          </Link>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button type="submit" className="text-sm text-gray-600 hover:text-black">
            Вийти
          </button>
        </form>
      </nav>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
