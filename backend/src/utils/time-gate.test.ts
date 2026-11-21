// Tests for the time gate: a surprise may only open at or after its delivery time.
import { describe, expect, it } from "vitest";
import { isDelivered } from "./time-gate";

const deliverAt = "2030-12-01T09:00:00Z";

describe("isDelivered", () => {
  it("is false one second before delivery time", () => {
    expect(isDelivered(deliverAt, new Date("2030-12-01T08:59:59Z"))).toBe(false);
  });

  it("is true exactly at delivery time", () => {
    expect(isDelivered(deliverAt, new Date("2030-12-01T09:00:00Z"))).toBe(true);
  });

  it("is true after delivery time", () => {
    expect(isDelivered(deliverAt, new Date("2031-01-01T00:00:00Z"))).toBe(true);
  });

  it("compares real moments, not text, across time zones", () => {
    // 10:00 in Paris (+01:00) is the same moment as 09:00 UTC.
    expect(isDelivered("2030-12-01T10:00:00+01:00", new Date("2030-12-01T09:00:00Z"))).toBe(true);
    expect(isDelivered("2030-12-01T10:00:00+01:00", new Date("2030-12-01T08:59:59Z"))).toBe(false);
  });
});
