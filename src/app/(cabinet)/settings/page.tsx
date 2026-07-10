import { requireCurrentPsychologist } from "@/lib/current-psychologist";
import { ProfileForm } from "./profile-form";
import { LiqpayForm } from "./liqpay-form";
import { PageHeader } from "@/components/ui/page-header";

export default async function SettingsPage() {
  const psychologist = await requireCurrentPsychologist();

  return (
    <div>
      <PageHeader
        eyebrow="Профіль"
        title="Налаштування"
        description="Публічний профіль, вартість сесій та приймання оплат."
      />
      <div className="mt-8 grid items-start gap-8 lg:grid-cols-2">
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
        <LiqpayForm
          hasCredentials={psychologist.liqpayPrivateKeyEnc != null}
          publicKey={psychologist.liqpayPublicKey ?? ""}
          mode={psychologist.liqpayMode}
        />
      </div>
    </div>
  );
}
