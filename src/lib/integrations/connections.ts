import { IntegrationProvider, IntegrationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { OAUTH_PROVIDERS } from "./oauth-config";

const FETCH_TIMEOUT_MS = 5_000;
// Refresh a bit ahead of the real expiry so a slow request doesn't land
// with an already-stale token.
const REFRESH_MARGIN_MS = 60_000;

export type Connection = {
  id: string;
  psychologistId: string;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  externalAccountEmail: string | null;
};

export class ConnectionExpiredError extends Error {}

function toConnection(row: {
  id: string;
  psychologistId: string;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  accessTokenEnc: string;
  refreshTokenEnc: string;
  expiresAt: Date;
  externalAccountEmail: string | null;
}): Connection {
  return {
    id: row.id,
    psychologistId: row.psychologistId,
    provider: row.provider,
    status: row.status,
    accessToken: decryptSecret(row.accessTokenEnc),
    refreshToken: decryptSecret(row.refreshTokenEnc),
    expiresAt: row.expiresAt,
    externalAccountEmail: row.externalAccountEmail,
  };
}

export async function getConnection(
  psychologistId: string,
  provider: IntegrationProvider
): Promise<Connection | null> {
  const row = await prisma.integrationConnection.findUnique({
    where: { psychologistId_provider: { psychologistId, provider } },
  });
  return row ? toConnection(row) : null;
}

export async function listConnections(psychologistId: string): Promise<Connection[]> {
  const rows = await prisma.integrationConnection.findMany({ where: { psychologistId } });
  return rows.map(toConnection);
}

export async function saveConnection(params: {
  psychologistId: string;
  provider: IntegrationProvider;
  accessToken: string;
  // Google's token endpoint only returns a refresh_token on the very first
  // consent (or when prompt=consent forces re-consent); omit it on a
  // refresh-triggered save to keep the existing one.
  refreshToken?: string;
  expiresAt: Date;
  externalAccountEmail?: string | null;
}): Promise<void> {
  const { psychologistId, provider, accessToken, refreshToken, expiresAt, externalAccountEmail } = params;

  if (!refreshToken) {
    await prisma.integrationConnection.updateMany({
      where: { psychologistId, provider },
      data: {
        accessTokenEnc: encryptSecret(accessToken),
        expiresAt,
        status: "ACTIVE",
        ...(externalAccountEmail !== undefined ? { externalAccountEmail } : {}),
      },
    });
    return;
  }

  await prisma.integrationConnection.upsert({
    where: { psychologistId_provider: { psychologistId, provider } },
    create: {
      psychologistId,
      provider,
      accessTokenEnc: encryptSecret(accessToken),
      refreshTokenEnc: encryptSecret(refreshToken),
      expiresAt,
      externalAccountEmail: externalAccountEmail ?? null,
      status: "ACTIVE",
    },
    update: {
      accessTokenEnc: encryptSecret(accessToken),
      refreshTokenEnc: encryptSecret(refreshToken),
      expiresAt,
      status: "ACTIVE",
      ...(externalAccountEmail !== undefined ? { externalAccountEmail } : {}),
    },
  });
}

export async function deleteConnection(psychologistId: string, provider: IntegrationProvider): Promise<void> {
  await prisma.integrationConnection.deleteMany({ where: { psychologistId, provider } });
}

async function markExpired(psychologistId: string, provider: IntegrationProvider): Promise<void> {
  await prisma.integrationConnection.updateMany({
    where: { psychologistId, provider },
    data: { status: "EXPIRED" },
  });
}

async function refreshAccessToken(connection: Connection): Promise<Connection> {
  const config = OAUTH_PROVIDERS[connection.provider];

  let response: Response;
  try {
    response = await fetch(config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: connection.refreshToken,
        client_id: config.clientId(),
        client_secret: config.clientSecret(),
      }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (error) {
    throw new Error(`${connection.provider} token refresh request failed: ${String(error)}`);
  }

  if (!response.ok) {
    await markExpired(connection.psychologistId, connection.provider);
    throw new ConnectionExpiredError(`${connection.provider} token refresh failed (${response.status})`);
  }

  const json = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };
  const expiresAt = new Date(Date.now() + json.expires_in * 1000);
  const refreshToken = json.refresh_token ?? connection.refreshToken;

  await saveConnection({
    psychologistId: connection.psychologistId,
    provider: connection.provider,
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt,
  });

  return {
    ...connection,
    accessToken: json.access_token,
    refreshToken,
    expiresAt,
    status: "ACTIVE",
  };
}

/**
 * fetch() wrapper for provider REST calls: refreshes the access token ahead
 * of expiry (or reactively on a 401), persisting the new token, and marks
 * the connection EXPIRED if the refresh itself is rejected (revoked access)
 * — see design.md D2/D4.
 */
export async function oauthFetch(connection: Connection, url: string, init: RequestInit = {}): Promise<Response> {
  let current = connection;
  if (current.expiresAt.getTime() - Date.now() < REFRESH_MARGIN_MS) {
    current = await refreshAccessToken(current);
  }

  const withAuth = (token: string): RequestInit => ({
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  let response = await fetch(url, withAuth(current.accessToken));

  if (response.status === 401) {
    current = await refreshAccessToken(current);
    response = await fetch(url, withAuth(current.accessToken));
  }

  return response;
}
