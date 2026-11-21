import { describe, expect, it } from "vitest";
import { generateToken, hashToken } from "./tokens";

describe("generateToken", () => {
  it("makes a 43 character url-safe token", () => {
    expect(generateToken()).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("makes a different token every time", () => {
    expect(generateToken()).not.toBe(generateToken());
  });
});

describe("hashToken", () => {
  it("gives the same hash for the same token", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
  });

  it("gives different hashes for different tokens", () => {
    expect(hashToken("abc")).not.toBe(hashToken("abd"));
  });

  it("never returns the token itself", () => {
    const token = generateToken();
    expect(hashToken(token)).not.toContain(token);
  });
});