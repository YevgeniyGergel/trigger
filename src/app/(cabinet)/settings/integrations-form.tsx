"use client";

import { useActionState } from "react";
import type { MeetingProviderType } from "@prisma/client";
import {
  disconnectIntegration,
  updateDefaultMeetingProvider,
  type MeetingProviderFormState,
} from "./actions";
import { Button, ButtonLink } from "@/components/ui/button";
import { Select, Label } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";

const INTEGRATION_ERROR_MESSAGES: Record<string, string> = {
  denied: "Підключення скасовано.",
  invalid_request: "Некоректний запит від провайдера.",
  invalid_state: "Сесію підключення прострочено. Спробуйте ще раз.",
  exchange_failed: "Не вдалося завершити підключення. Спробуйте ще раз.",
};

export type ConnectionSummary = {
  status: "ACTIVE" | "EXPIRED";
  externalAccountEmail: string | null;
} | null;

function ProviderCard({
  title,
  connectSlug,
  connection,
}: {
  title: string;
  connectSlug: "google" | "zoom";
  connection: ConnectionSummary;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-line px-4 py-3">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-ink">{title}</span>
          {connection ? (
            connection.status === "ACTIVE" ? (
              <Badge tone="success">підключено</Badge>
            ) : (
              <Badge tone="warning">потребує повторного підключення</Badge>
            )
          ) : (
            <Badge tone="neutral">не підключено</Badge>
          )}
        </div>
        {connection?.externalAccountEmail ? (
          <p className="mt-0.5 text-xs text-ink-muted">{connection.externalAccountEmail}</p>
        ) : null}
      </div>
      {connection ? (
        <form action={disconnectIntegration.bind(null, connectSlug === "google" ? "GOOGLE" : "ZOOM")}>
          <Button type="submit" variant="secondary" size="sm">
            Відключити
          </Button>
        </form>
      ) : (
        <ButtonLink href={`/api/integrations/${connectSlug}/connect`} variant="secondary" size="sm">
          Підключити
        </ButtonLink>
      )}
    </div>
  );
}

const providerFormInitialState: MeetingProviderFormState = {};

export function IntegrationsForm({
  googleConnection,
  zoomConnection,
  defaultMeetingProvider,
  integrationError,
}: {
  googleConnection: ConnectionSummary;
  zoomConnection: ConnectionSummary;
  defaultMeetingProvider: MeetingProviderType;
  integrationError?: string;
}) {
  const [state, formAction, pending] = useActionState(updateDefaultMeetingProvider, providerFormInitialState);

  const googleActive = googleConnection?.status === "ACTIVE";
  const zoomActive = zoomConnection?.status === "ACTIVE";

  return (
    <div className="space-y-5">
      {integrationError ? (
        <Alert tone="danger">
          {INTEGRATION_ERROR_MESSAGES[integrationError] ?? "Не вдалося підключити сервіс."}
        </Alert>
      ) : null}

      <div className="space-y-3">
        <ProviderCard title="Google Calendar" connectSlug="google" connection={googleConnection} />
        <ProviderCard title="Zoom" connectSlug="zoom" connection={zoomConnection} />
      </div>

      <form action={formAction} className="border-t border-line pt-5">
        <Label htmlFor="defaultMeetingProvider">Онлайн-зустріч за замовчуванням</Label>
        <Select id="defaultMeetingProvider" name="defaultMeetingProvider" defaultValue={defaultMeetingProvider}>
          <option value="NONE">Без онлайн-зустрічі</option>
          <option value="GOOGLE_MEET" disabled={!googleActive}>
            Google Meet{!googleActive ? " (спершу підключіть Google Calendar)" : ""}
          </option>
          <option value="ZOOM" disabled={!zoomActive}>
            Zoom{!zoomActive ? " (спершу підключіть Zoom)" : ""}
          </option>
        </Select>
        {state.error ? (
          <Alert tone="danger" className="mt-3">
            {state.error}
          </Alert>
        ) : null}
        {state.success ? (
          <Alert tone="success" className="mt-3">
            Збережено
          </Alert>
        ) : null}
        <Button type="submit" className="mt-3" disabled={pending}>
          {pending ? "Збереження..." : "Зберегти"}
        </Button>
      </form>
    </div>
  );
}

