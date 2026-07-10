import { requireCurrentPsychologist } from "@/lib/current-psychologist";
import { ProfileForm } from "./profile-form";

export default async function SettingsPage() {
  const psychologist = await requireCurrentPsychologist();

  return (
    <div>
      <h1 className="text-2xl font-semibold">Налаштування профілю</h1>
      <ProfileForm
        defaultValues={{
          name: psychologist.name,
          slug: psychologist.slug,
          description: psychologist.description ?? "",
          defaultSessionPriceUah:
            psychologist.defaultSessionPriceCents != null
              ? String(psychologist.defaultSessionPriceCents / 100)
              : "",
        }}
      />
    </div>
  );
}
