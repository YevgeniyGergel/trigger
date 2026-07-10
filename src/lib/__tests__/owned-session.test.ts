import { describe, expect, it, vi } from "vitest";

const findFirst = vi.fn().mockResolvedValue({ id: "s1", psychologistId: "p1" });

vi.mock("../prisma", () => ({
  prisma: { session: { findFirst: (...args: unknown[]) => findFirst(...args) } },
}));

const { getOwnedSession } = await import("../owned-session");

describe("getOwnedSession", () => {
  it("scopes the query to the requesting psychologist — cross-tenant access is impossible by construction", async () => {
    await getOwnedSession("p1", "s1");

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "s1", psychologistId: "p1" },
      })
    );
  });

  it("returns null (not another psychologist's session) when the ids don't match the owner", async () => {
    findFirst.mockResolvedValueOnce(null);
    const result = await getOwnedSession("someone-else", "s1");
    expect(result).toBeNull();
  });
});
