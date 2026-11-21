// Tests for private-link tokens: they must be random and unguessable,
// and the database only ever stores their hash.
import { describe, expect, it } from "vitest";
import { generateToken, hashToken } from "./tokens";

describe("generateToken", () => {
  it("makes a 43-character, URL-safe token", () => {
    // open-surprise.ts relies on this exact shape.
    expect(generateToken()).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("makes a different token every time", () => {
    const tokens = new Set(Array.from({ length: 1000 }, () => generateToken()));
    expect(tokens.size).toBe(1000);
  });
});

describe("hashToken", () => {
  it("gives the same hash for the same token", () => {
    const token = generateToken();
    expect(hashToken(token)).toBe(hashToken(token));
  });

  it("gives a 64-character hex hash that does not contain the token", () => {
    const token = generateToken();
    const hash = hashToken(token);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain(token);
  });

  it("gives different hashes for different tokens", () => {
    expect(hashToken(generateToken())).not.toBe(hashToken(generateToken()));
  });
});
