"use client";

import { useActionState } from "react";
import {
  updateNotificationPreferences,
  generateTelegramLink,
  type NotificationPrefsState,
  type TelegramLinkState,
} from "./actions";
import { Card, CardBody } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

const prefsInitialState: NotificationPrefsState = {};
const linkInitialState: TelegramLinkState = {};

type Props = {
  emailNotificationsEnabled: boolean;
  telegramNotificationsEnabled: boolean;
  telegramLinked: boolean;
};

export function NotificationsForm({
  emailNotificationsEnabled,
  telegramNotificationsEnabled,
  telegramLinked,
}: Props) {
  const [prefsState, prefsAction, prefsPending] = useActionState(
    updateNotificationPreferences,
    prefsInitialState
  );
  const [linkState, linkAction, linkPending] = useActionState(generateTelegramLink, linkInitialState);

  return (
    <Card>
      <CardBody>
        <SectionTitle>Сповіщення</SectionTitle>
        <form action={prefsAction} className="mt-5 space-y-3">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              name="emailNotificationsEnabled"
              defaultChecked={emailNotificationsEnabled}
              className="size-4 rounded border-line text-sage-600 focus:ring-sage-300"
            />
            Email-сповіщення
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              name="telegramNotificationsEnabled"
              defaultChecked={telegramNotificationsEnabled}
              disabled={!telegramLinked}
              className="size-4 rounded border-line text-sage-600 focus:ring-sage-300"
            />
            Telegram-сповіщення {telegramLinked ? <Badge tone="success">підключено</Badge> : <Badge tone="neutral">не підключено</Badge>}
          </label>
          {prefsState.error ? <Alert tone="danger">{prefsState.error}</Alert> : null}
          {prefsState.success ? <Alert tone="success">Збережено</Alert> : null}
          <Button type="submit" disabled={prefsPending}>
            {prefsPending ? "Збереження..." : "Зберегти"}
          </Button>
        </form>

        {!telegramLinked && (
          <form action={linkAction} className="mt-5 border-t border-line pt-5">
            <p className="text-sm text-ink-muted">
              Підключіть Telegram, щоб отримувати сповіщення там, а не лише на email.
            </p>
            {linkState.error ? (
              <Alert tone="danger" className="mt-2">
                {linkState.error}
              </Alert>
            ) : null}
            {linkState.linkUrl ? (
              <a
                href={linkState.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 block font-medium text-sage-700 underline decoration-sage-300 underline-offset-2 hover:decoration-sage-600"
              >
                Відкрити Telegram-бота для підключення
              </a>
            ) : (
              <Button type="submit" variant="secondary" className="mt-2" disabled={linkPending}>
                {linkPending ? "..." : "Отримати посилання"}
              </Button>
            )}
          </form>
        )}
      </CardBody>
    </Card>
  );
}
