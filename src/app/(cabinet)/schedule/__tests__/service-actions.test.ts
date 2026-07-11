import { beforeEach, describe, expect, it, vi } from "vitest";

const requireCurrentPsychologist = vi.fn();
const serviceTypeFindFirst = vi.fn();
const serviceTypeDelete = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/current-psychologist", () => ({
  requireCurrentPsychologist: () => requireCurrentPsychologist(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    serviceType: {
      findFirst: (...args: unknown[]) => serviceTypeFindFirst(...args),
      delete: (...args: unknown[]) => serviceTypeDelete(...args),
    },
  },
}));

const { deleteServiceType } = await import("../service-actions");

function service(overrides: Partial<{ isDefault: boolean; sessions: number }> = {}) {
  return {
    id: "svc_1",
    isDefault: overrides.isDefault ?? false,
    _count: { sessions: overrides.sessions ?? 0 },
  };
}

describe("deleteServiceType", () => {
  beforeEach(() => {
    requireCurrentPsychologist.mockReset().mockResolvedValue({ id: "psych_1" });
    serviceTypeFindFirst.mockReset();
    serviceTypeDelete.mockReset();
  });

  it("deletes a non-default service that no sessions reference", async () => {
    serviceTypeFindFirst.mockResolvedValue(service());

    const result = await deleteServiceType("svc_1");

    expect(result.error).toBeUndefined();
    expect(serviceTypeDelete).toHaveBeenCalledWith({ where: { id: "svc_1" } });
  });

  it("refuses to delete the default service", async () => {
    serviceTypeFindFirst.mockResolvedValue(service({ isDefault: true }));

    const result = await deleteServiceType("svc_1");

    expect(result.error).toBeDefined();
    expect(serviceTypeDelete).not.toHaveBeenCalled();
  });

  it("refuses to delete a service that sessions reference", async () => {
    serviceTypeFindFirst.mockResolvedValue(service({ sessions: 3 }));

    const result = await deleteServiceType("svc_1");

    expect(result.error).toBeDefined();
    expect(serviceTypeDelete).not.toHaveBeenCalled();
  });

  it("returns an error for a foreign or unknown service", async () => {
    serviceTypeFindFirst.mockResolvedValue(null);

    const result = await deleteServiceType("svc_other");

    expect(result.error).toBe("Послугу не знайдено");
    expect(serviceTypeDelete).not.toHaveBeenCalled();
  });
});
