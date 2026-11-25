import { describe, expect, it } from "vitest";
import { signupErrors } from "@/lib/demo-data";
const ok = { name: "Asha Rao", mobile: "9876543210", password: "secret1", confirm: "secret1", invite: "PB50RK", agree: true };
describe("signup rules", () => {
  it("accepts a valid form", () => expect(signupErrors(ok)).toEqual({}));
  it("requires a 10-digit Indian mobile", () => expect(signupErrors({ ...ok, mobile: "12345" }).mobile).toBeDefined());
  it("requires the invitation code", () => expect(signupErrors({ ...ok, invite: "" }).invite).toBe("Invitation code is required"));
  it("rejects unknown invitation codes", () => expect(signupErrors({ ...ok, invite: "NOPE" }).invite).toBe("Invalid invitation code"));
  it("requires matching passwords", () => expect(signupErrors({ ...ok, confirm: "other" }).confirm).toBe("Passwords do not match"));
  it("requires accepting terms", () => expect(signupErrors({ ...ok, agree: false }).agree).toBeDefined());
});
