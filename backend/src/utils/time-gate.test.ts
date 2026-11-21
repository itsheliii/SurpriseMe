// test file 
import { describe, expect, it } from "vitest";
import { isDelivered } from "./time-gate";

const deliverAt = "2026-12-01T09:00:00.000Z";

describe("isDelivered", () => {
  it("is false before the delivery time", () => {
    expect(isDelivered(deliverAt, new Date("2026-12-01T08:59:59.000Z"))).toBe(false);
  });

  it("is true at the exact delivery time", () => {
    expect(isDelivered(deliverAt, new Date("2026-12-01T09:00:00.000Z"))).toBe(true);
  });

  it("is true after the delivery time", () => {
    expect(isDelivered(deliverAt, new Date("2026-12-02T00:00:00.000Z"))).toBe(true);
  });
});

// Extra case added later.
describe("isDelivered across time zones", () => {
  it("compares real moments, not text", () => {
    // 10:00 in Paris (+01:00) is the same moment as 09:00 UTC.
    expect(isDelivered("2026-12-01T10:00:00+01:00", new Date("2026-12-01T09:00:00Z"))).toBe(true);
    expect(isDelivered("2026-12-01T10:00:00+01:00", new Date("2026-12-01T08:59:59Z"))).toBe(false);
  });
});
