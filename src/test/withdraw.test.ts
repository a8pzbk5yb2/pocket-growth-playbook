import { describe, expect, it } from "vitest";
import { withdrawError } from "@/lib/demo-data";

describe("withdraw rules", () => {
  it("rejects below ₹100", () => expect(withdrawError(99, 1000)).toMatch(/Minimum/));
  it("rejects above balance", () => expect(withdrawError(500, 0)).toMatch(/balance/));
  it("accepts ₹100 with enough balance", () => expect(withdrawError(100, 100)).toBeNull());
});
