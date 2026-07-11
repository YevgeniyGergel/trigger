import { NextResponse } from "next/server";
import type { IntegrationProvider } from "@prisma/client";
import { OAUTH_PROVIDERS, integrationsRedirectBaseUrl, fetchAccountEmail } from "@/lib/integrations/oauth-config";
import { verifyOAuthState } from "@/lib/integrations/state";
import { saveConnection } from "@/lib/integrations/connections";
import { prisma } from "@/lib/prisma";

const PROVIDER_SLUGS: Record<string, IntegrationProvider> = {
  google: "GOOGLE",
  zoom: "ZOOM",
};

function settingsRedirect(error?: string): NextResponse {
  const url = new URL("/settings", integrationsRedirectBaseUrl());
  if (error) {
    url.searchParams.set("integrationError", error);
  }
  return NextResponse.redirect(url.toString());
}

export async function GET(request: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider: slug } = await ctx.params;
  const provider = PROVIDER_SLUGS[slug];
  if (!provider) {
    return NextResponse.json({ error: "unknown provider" }, { status: 404 });
  }

  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (error) {
    return settingsRedirect("denied");
  }
  if (!code || !state) {
    return settingsRedirect("invalid_request");
  }

  const verified = verifyOAuthState(state);
  if (!verified) {
    return settingsRedirect("invalid_state");
  }

  const psychologist = await prisma.psychologist.findUnique({ where: { id: verified.psychologistId } });
  if (!psychologist) {
    return settingsRedirect("invalid_state");
  }

  const config = OAUTH_PROVIDERS[provider];
  const redirectUri = `${integrationsRedirectBaseUrl()}/api/integrations/${slug}/callback`;

  let tokenResponse: Response;
  try {
    tokenResponse = await fetch(config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: config.clientId(),
        client_secret: config.clientSecret(),
      }),
      signal: AbortSignal.timeout(5_000),
    });
  } catch (err) {
    console.error(`[integrations] ${provider} token exchange request failed:`, err);
    return settingsRedirect("exchange_failed");
  }

  if (!tokenResponse.ok) {
    console.error(`[integrations] ${provider} token exchange failed (${tokenResponse.status})`);
    return settingsRedirect("exchange_failed");
  }

  const json = (await tokenResponse.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  if (!json.refresh_token) {
    // Google omits refresh_token if the psychologist already granted
    // consent and prompt=consent somehow didn't force re-issue; without one
    // sync can't survive past the first access-token expiry.
    console.error(`[integrations] ${provider} token exchange returned no refresh_token`);
    return settingsRedirect("exchange_failed");
  }

  const expiresAt = new Date(Date.now() + json.expires_in * 1000);
  const externalAccountEmail = await fetchAccountEmail(provider, json.access_token);

  await saveConnection({
    psychologistId: psychologist.id,
    provider,
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt,
    externalAccountEmail,
  });

  return settingsRedirect();
}
