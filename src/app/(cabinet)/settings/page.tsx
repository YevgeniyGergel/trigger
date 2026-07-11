import type { ReactNode } from "react";
import Link from "next/link";
import { requireCurrentPsychologist } from "@/lib/current-psychologist";
import { ProfileForm } from "./profile-form";
import { LiqpayForm } from "./liqpay-form";
import { NotificationsForm } from "./notifications-form";
import { NoteLanguageForm } from "./note-language-form";
import { PageHeader, SectionTitle } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function SettingsSection({
  title,
  badge,
  description,
  children,
}: {
  title: ReactNode;
  badge?: ReactNode;
  description: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
      <div>
        <div className="flex items-center gap-2.5">
          <SectionTitle>{title}</SectionTitle>
          {badge}
        </div>
        <p className="mt-1.5 text-sm text-ink-muted">{description}</p>
      </div>
      <Card className="max-w-2xl">
        <CardBody>{children}</CardBody>
      </Card>
    </section>
  );
}

export default async function SettingsPage() {
  const psychologist = await requireCurrentPsychologist();
  const liqpayConnected = psychologist.liqpayPrivateKeyEnc != null;

  return (
    <div>
      <PageHeader
        eyebrow="Профіль"
        title="Налаштування"
        description="Публічний профіль, вартість сесій та приймання оплат."
      />
      <div className="mt-10 space-y-10">
        <SettingsSection
          title="Публічний профіль"
          description="Ім'я, посилання для запису та опис — те, що бачать клієнти. Тривалість і вартість сесій налаштовуються на сторінці Розклад."
        >
          <ProfileForm
            defaultValues={{
              name: psychologist.name,
              slug: psychologist.slug,
              description: psychologist.description ?? "",
            }}
          />
          <p className="mt-4 text-sm text-ink-muted">
            Послуги, їх тривалість і вартість —{" "}
            <Link href="/schedule" className="font-medium text-sage-700 hover:underline">
              на сторінці Розклад
            </Link>
            .
          </p>
        </SettingsSection>

        <SettingsSection
          title="Оплати · LiqPay"
          badge={
            liqpayConnected ? (
              <Badge tone="success">підключено</Badge>
            ) : (
              <Badge tone="neutral">не підключено</Badge>
            )
          }
          description="Ключі мерчант-акаунта LiqPay, щоб клієнти могли оплачувати сесії онлайн."
        >
          <LiqpayForm
            hasCredentials={liqpayConnected}
            publicKey={psychologist.liqpayPublicKey ?? ""}
            mode={psychologist.liqpayMode}
          />
        </SettingsSection>

        <SettingsSection
          title="Голосові нотатки сесій"
          description="Мова, якою розпізнається аудіозапис сесії при створенні нотатки."
        >
          <NoteLanguageForm noteLanguage={psychologist.noteLanguage} />
        </SettingsSection>

        <SettingsSection
          title="Сповіщення"
          description="Оберіть, де отримувати сповіщення про нові записи та зміни сесій."
        >
          <NotificationsForm
            emailNotificationsEnabled={psychologist.emailNotificationsEnabled}
            telegramNotificationsEnabled={psychologist.telegramNotificationsEnabled}
            telegramLinked={psychologist.telegramChatId != null}
          />
        </SettingsSection>
      </div>
    </div>
  );
}
