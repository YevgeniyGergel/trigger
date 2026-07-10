import { redirect } from "next/navigation";

export default function Home() {
  // No public marketing homepage in MVP scope (see design.md non-goals) —
  // /dashboard itself redirects to /login when unauthenticated.
  redirect("/dashboard");
}
