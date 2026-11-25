import { describe, expect, it, vi } from "vitest";
describe("api client", () => {
  it("refuses to call when no server address is configured", async () => {
    vi.stubEnv("VITE_API_BASE_URL", ""); vi.resetModules();
    const { ApiError, request } = await import("@/lib/api");
    await expect(request("GET", "/health")).rejects.toMatchObject({ code: "not_configured" });
    expect(new ApiError(422, "validation", "x", { mobile: "bad" }).fields["mobile"]).toBe("bad");
    vi.unstubAllEnvs();
  });
});
