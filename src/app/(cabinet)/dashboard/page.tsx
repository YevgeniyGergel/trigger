import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div>
      <h1 className="text-2xl font-semibold">Кабінет</h1>
      <p className="mt-2 text-gray-600">Вітаємо, {session?.user?.name}.</p>
    </div>
  );
}
