// Tests for error responses: each error gets the right HTTP status,
// and unexpected errors never leak internal details.
import { describe, expect, it } from "vitest";
import { AppError, badRequest, forbidden, json, notFound, toResponse, unauthorized } from "./errors";

describe("error helpers", () => {
  it("use the right HTTP status codes", () => {
    expect(badRequest().statusCode).toBe(400);
    expect(unauthorized().statusCode).toBe(401);
    expect(forbidden().statusCode).toBe(403);
    expect(notFound().statusCode).toBe(404);
  });
});

describe("json", () => {
  it("builds a JSON response", () => {
    const res = json(201, { ok: true });
    expect(res.statusCode).toBe(201);
    expect(res.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(res.body)).toEqual({ ok: true });
  });
});

describe("toResponse", () => {
  it("passes on our own errors with their status and message", () => {
    const res = toResponse(notFound("Surprise not found"));
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body)).toEqual({ error: "Surprise not found" });
  });

  it("turns any other error into a generic 500 without its details", () => {
    const res = toResponse(new Error("DynamoDB table surpriseme-dev is broken"));
    expect(res.statusCode).toBe(500);
    expect(res.body).not.toContain("DynamoDB");
    expect(JSON.parse(res.body)).toEqual({ error: "Something went wrong" });
  });

  it("keeps AppError usable as a normal Error", () => {
    expect(new AppError(418, "x")).toBeInstanceOf(Error);
  });
});
