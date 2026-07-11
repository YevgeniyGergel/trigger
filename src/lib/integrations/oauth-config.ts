import type { IntegrationProvider } from "@prisma/client";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

export type OAuthProviderConfig = {
  authUrl: string;
  tokenUrl: string;
  revokeUrl: string;
  scope: string;
  extraAuthParams?: Record<string, string>;
  clientId(): string;
  clientSecret(): string;
};

export const OAUTH_PROVIDERS: Record<IntegrationProvider, OAuthProviderConfig> = {
  GOOGLE: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    revokeUrl: "https://oauth2.googleapis.com/revoke",
    // calendar.events: create/update/delete events; calendar.readonly: freeBusy.
    scope:
      "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/userinfo.email",
    // access_type=offline + prompt=consent guarantee a refresh_token is
    // returned even if the psychologist connected once before.
    extraAuthParams: { access_type: "offline", prompt: "consent" },
    clientId: () => requireEnv("GOOGLE_CLIENT_ID"),
    clientSecret: () => requireEnv("GOOGLE_CLIENT_SECRET"),
  },
  ZOOM: {
    authUrl: "https://zoom.us/oauth/authorize",
    tokenUrl: "https://zoom.us/oauth/token",
    revokeUrl: "https://zoom.us/oauth/revoke",
    scope: "meeting:write meeting:read user:read",
    clientId: () => requireEnv("ZOOM_CLIENT_ID"),
    clientSecret: () => requireEnv("ZOOM_CLIENT_SECRET"),
  },
};

export function integrationsRedirectBaseUrl(): string {
  return (
    process.env.INTEGRATIONS_REDIRECT_BASE_URL ?? process.env.APP_BASE_URL ?? "http://localhost:3000"
  );
}

const ACCOUNT_EMAIL_URLS: Record<IntegrationProvider, string> = {
  GOOGLE: "https://www.googleapis.com/oauth2/v2/userinfo",
  ZOOM: "https://api.zoom.us/v2/users/me",
};

export async function fetchAccountEmail(provider: IntegrationProvider, accessToken: string): Promise<string | null> {
  const response = await fetch(ACCOUNT_EMAIL_URLS[provider], {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) {
    return null;
  }
  const json = (await response.json()) as { email?: string };
  return json.email ?? null;
}
