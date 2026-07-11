import { NextResponse } from "next/server";
import type { IntegrationProvider } from "@prisma/client";
import { requireCurrentPsychologist } from "@/lib/current-psychologist";
import { OAUTH_PROVIDERS, integrationsRedirectBaseUrl } from "@/lib/integrations/oauth-config";
import { createOAuthState } from "@/lib/integrations/state";

const PROVIDER_SLUGS: Record<string, IntegrationProvider> = {
  google: "GOOGLE",
  zoom: "ZOOM",
};

export async function GET(_request: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider: slug } = await ctx.params;
  const provider = PROVIDER_SLUGS[slug];
  if (!provider) {
    return NextResponse.json({ error: "unknown provider" }, { status: 404 });
  }

  const psychologist = await requireCurrentPsychologist();
  const config = OAUTH_PROVIDERS[provider];
  const redirectUri = `${integrationsRedirectBaseUrl()}/api/integrations/${slug}/callback`;

  const url = new URL(config.authUrl);
  url.searchParams.set("client_id", config.clientId());
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", config.scope);
  url.searchParams.set("state", createOAuthState(psychologist.id));
  for (const [key, value] of Object.entries(config.extraAuthParams ?? {})) {
    url.searchParams.set(key, value);
  }

  return NextResponse.redirect(url.toString());
}
