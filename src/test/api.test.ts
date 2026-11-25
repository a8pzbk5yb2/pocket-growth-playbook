import { describe, expect, it } from "vitest";
import { ApiError, request } from "@/lib/api";
describe("api client", () => {
  it("refuses to call when no server address is configured", async () => {
    await expect(request("GET", "/health")).rejects.toMatchObject({ code: "not_configured" });
    expect(new ApiError(422, "validation", "x", { mobile: "bad" }).fields["mobile"]).toBe("bad");
  });
});
