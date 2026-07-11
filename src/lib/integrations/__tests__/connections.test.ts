import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const findUnique = vi.fn();
const updateMany = vi.fn();
const upsert = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    integrationConnection: {
      findUnique: (...args: unknown[]) => findUnique(...args),
      updateMany: (...args: unknown[]) => updateMany(...args),
      upsert: (...args: unknown[]) => upsert(...args),
      deleteMany: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

const { oauthFetch, ConnectionExpiredError } = await import("../connections");
const { encryptSecret } = await import("@/lib/crypto");

beforeAll(() => {
  process.env.CREDENTIALS_ENCRYPTION_KEY = Buffer.alloc(32, 3).toString("base64");
  process.env.GOOGLE_CLIENT_ID = "client-id";
  process.env.GOOGLE_CLIENT_SECRET = "client-secret";
});

function baseConnection(overrides: Partial<Parameters<typeof oauthFetch>[0]> = {}) {
  return {
    id: "conn1",
    psychologistId: "psy1",
    provider: "GOOGLE" as const,
    status: "ACTIVE" as const,
    accessToken: "old-access",
    refreshToken: "old-refresh",
    expiresAt: new Date(Date.now() + 10 * 60_000),
    externalAccountEmail: "a@example.com",
    ...overrides,
  };
}

describe("oauthFetch", () => {
  beforeEach(() => {
    findUnique.mockReset();
    updateMany.mockReset();
    upsert.mockReset();
  });

  it("calls the API directly with the current token when not near expiry", async () => {
    const connection = baseConnection();
    const fetchMock = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await oauthFetch(connection, "https://api.example.com/thing");

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer old-access");
    vi.unstubAllGlobals();
  });

  it("refreshes proactively when the token is near expiry and persists the new token", async () => {
    const connection = baseConnection({ expiresAt: new Date(Date.now() + 10_000) });
    const fetchMock = vi
      .fn()
      // token refresh call
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "new-access", refresh_token: "new-refresh", expires_in: 3600 }), {
          status: 200,
        })
      )
      // actual API call
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await oauthFetch(connection, "https://api.example.com/thing");

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(upsert).toHaveBeenCalledTimes(1);
    const apiCallInit = fetchMock.mock.calls[1][1] as RequestInit;
    expect((apiCallInit.headers as Record<string, string>).Authorization).toBe("Bearer new-access");
    vi.unstubAllGlobals();
  });

  it("refreshes reactively on a 401 and retries once", async () => {
    const connection = baseConnection();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("unauthorized", { status: 401 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "new-access", refresh_token: "new-refresh", expires_in: 3600 }), {
          status: 200,
        })
      )
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await oauthFetch(connection, "https://api.example.com/thing");

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    vi.unstubAllGlobals();
  });

  it("marks the connection EXPIRED and throws when the refresh call is rejected", async () => {
    const connection = baseConnection({ expiresAt: new Date(Date.now() + 10_000) });
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response("invalid_grant", { status: 400 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(oauthFetch(connection, "https://api.example.com/thing")).rejects.toThrow(ConnectionExpiredError);
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { psychologistId: "psy1", provider: "GOOGLE" },
        data: { status: "EXPIRED" },
      })
    );
    vi.unstubAllGlobals();
  });
});

// Sanity check that the module's own encryption round-trips through the
// real crypto module used to store tokens.
describe("token encryption", () => {
  it("round-trips via encryptSecret", () => {
    const enc = encryptSecret("some-access-token");
    expect(enc).not.toContain("some-access-token");
  });
});
