// Tests for POST /surprises (create-surprise.ts).
import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveSurprise } from "../../database/surprises-db";
import { authedRequest, bodyOf } from "../../test-utils/events";
import { handler } from "./create-surprise";

// Replace the database and logger with fakes we can inspect.
vi.mock("../../database/surprises-db");
vi.mock("../../utils/logger");

const validInput = {
  title: "Happy 30th, Sam!",
  eventType: "birthday",
  revealStyle: "confetti",
  recipientName: "Sam",
  deliverAt: "2099-12-01T09:00:00Z",
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("create-surprise", () => {
  it("rejects a request that is not logged in (401)", async () => {
    const res = await handler(authedRequest({ body: JSON.stringify(validInput) }));
    expect(res.statusCode).toBe(401);
    expect(saveSurprise).not.toHaveBeenCalled();
  });

  it("rejects a body that is not valid JSON (400)", async () => {
    const res = await handler(authedRequest({ userId: "user-123", body: "{not json" }));
    expect(res.statusCode).toBe(400);
    expect(bodyOf(res).error).toBe("Body must be valid JSON");
  });

  it("rejects a missing body (400)", async () => {
    const res = await handler(authedRequest({ userId: "user-123" }));
    expect(res.statusCode).toBe(400);
  });

  it("rejects input that breaks the shared rules, with the rule's message (400)", async () => {
    const body = JSON.stringify({ ...validInput, recipientPhone: "6175551234" });
    const res = await handler(authedRequest({ userId: "user-123", body }));
    expect(res.statusCode).toBe(400);
    expect(bodyOf(res).error).toBe("Use international format, e.g. +16175551234");
    expect(saveSurprise).not.toHaveBeenCalled();
  });

  it("rejects a delivery time in the past (400)", async () => {
    const body = JSON.stringify({ ...validInput, deliverAt: "2020-01-01T00:00:00Z" });
    const res = await handler(authedRequest({ userId: "user-123", body }));
    expect(res.statusCode).toBe(400);
    expect(bodyOf(res).error).toBe("deliverAt must be in the future");
    expect(saveSurprise).not.toHaveBeenCalled();
  });

  it("creates a draft owned by the logged-in user (201)", async () => {
    const res = await handler(authedRequest({ userId: "user-123", body: JSON.stringify(validInput) }));
    expect(res.statusCode).toBe(201);

    const saved = vi.mocked(saveSurprise).mock.calls[0][0];
    expect(saved).toMatchObject({ ...validInput, ownerId: "user-123", status: "draft" });
    expect(saved.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(saved.createdAt).toBe(saved.updatedAt);
    expect(bodyOf(res)).toEqual(saved);
  });

  it("ignores an ownerId or status sent in the body", async () => {
    const body = JSON.stringify({ ...validInput, ownerId: "someone-else", status: "delivered" });
    await handler(authedRequest({ userId: "user-123", body }));
    const saved = vi.mocked(saveSurprise).mock.calls[0][0];
    expect(saved.ownerId).toBe("user-123");
    expect(saved.status).toBe("draft");
  });

  it("answers 500 without details when the database fails", async () => {
    vi.mocked(saveSurprise).mockRejectedValue(new Error("DynamoDB is down"));
    const res = await handler(authedRequest({ userId: "user-123", body: JSON.stringify(validInput) }));
    expect(res.statusCode).toBe(500);
    expect(res.body).not.toContain("DynamoDB");
  });
});
