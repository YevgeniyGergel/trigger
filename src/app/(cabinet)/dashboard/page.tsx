import { requireCurrentPsychologist } from "@/lib/current-psychologist";

export default async function DashboardPage() {
  const psychologist = await requireCurrentPsychologist();

  return (
    <div>
      <h1 className="text-2xl font-semibold">Кабінет</h1>
      <p className="mt-2 text-gray-600">Вітаємо, {psychologist.name}.</p>
    </div>
  );
}
