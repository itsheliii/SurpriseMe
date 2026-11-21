// Tests for reading a surprise id from the URL: only real UUIDs get through.
import { describe, expect, it } from "vitest";
import { AppError } from "./errors";
import { parseSurpriseId } from "./ids";

describe("parseSurpriseId", () => {
  it("returns a valid id unchanged", () => {
    const id = "0b6f8f9e-2c1d-4c3b-9a8e-1f2d3c4b5a69";
    expect(parseSurpriseId(id)).toBe(id);
  });

  it("rejects anything that is not a UUID with a 400 error", () => {
    for (const bad of [undefined, "", "123", "../../etc/passwd", 42]) {
      expect(() => parseSurpriseId(bad)).toThrowError(AppError);
      try {
        parseSurpriseId(bad);
      } catch (err) {
        expect((err as AppError).statusCode).toBe(400);
      }
    }
  });
});
