import { describe, expect, it, vi } from "vitest";
describe("api client", () => {
  it("refuses to call when no server address is configured", async () => {
    vi.stubEnv("VITE_API_BASE_URL", ""); vi.resetModules();
    const { ApiError, errMessage, request } = await import("@/lib/api");
    await expect(request("GET", "/health")).rejects.toMatchObject({ code: "not_configured" });
    const err = new ApiError(422, "validation", "x", { mobile: "bad" });
    expect(err.fields["mobile"]).toBe("bad");
    expect(errMessage(err)).toBe("x");
    expect(errMessage(new Error("boom"), "fallback")).toBe("fallback");
    vi.unstubAllEnvs();
  });

  it("hides DemoBanner and Demo badge when VITE_API_BASE_URL is configured", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "/api/public/v1"); vi.resetModules();
    const { DemoBanner } = await import("@/components/panel/layout");
    const { Demo } = await import("@/components/panel/ui");
    expect(DemoBanner()).toBeNull();
    expect(Demo()).toBeNull();

    vi.stubEnv("VITE_API_BASE_URL", ""); vi.resetModules();
    const { DemoBanner: DemoBannerOff } = await import("@/components/panel/layout");
    const { Demo: DemoOff } = await import("@/components/panel/ui");
    expect(DemoBannerOff()).not.toBeNull();
    expect(DemoOff()).not.toBeNull();
    vi.unstubAllEnvs();
  });
});
