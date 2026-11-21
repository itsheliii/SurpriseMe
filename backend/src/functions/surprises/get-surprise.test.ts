// Tests for GET /surprises/{id} (get-surprise.ts).
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSurprise } from "../../database/surprises-db";
import { authedRequest, bodyOf, makeSurprise } from "../../test-utils/events";
import { handler } from "./get-surprise";

vi.mock("../../database/surprises-db");
vi.mock("../../utils/logger");

const surprise = makeSurprise();
const pathParameters = { id: surprise.id };

beforeEach(() => {
  vi.resetAllMocks();
});

describe("get-surprise", () => {
  it("rejects a request that is not logged in (401)", async () => {
    const res = await handler(authedRequest({ pathParameters }));
    expect(res.statusCode).toBe(401);
  });

  it("rejects an id that is not a valid UUID (400), without asking the database", async () => {
    const res = await handler(authedRequest({ userId: "user-123", pathParameters: { id: "abc" } }));
    expect(res.statusCode).toBe(400);
    expect(getSurprise).not.toHaveBeenCalled();
  });

  it("returns the owner's surprise (200)", async () => {
    vi.mocked(getSurprise).mockResolvedValue(surprise);
    const res = await handler(authedRequest({ userId: "user-123", pathParameters }));
    expect(res.statusCode).toBe(200);
    expect(bodyOf(res)).toEqual({ surprise });
  });

  it("answers 404 when the surprise does not exist", async () => {
    vi.mocked(getSurprise).mockResolvedValue(null);
    const res = await handler(authedRequest({ userId: "user-123", pathParameters }));
    expect(res.statusCode).toBe(404);
  });

  it("answers someone else's surprise exactly like a missing one (404), so strangers learn nothing", async () => {
    vi.mocked(getSurprise).mockResolvedValue(null);
    const missing = await handler(authedRequest({ userId: "user-999", pathParameters }));

    vi.mocked(getSurprise).mockResolvedValue(surprise);
    const notYours = await handler(authedRequest({ userId: "user-999", pathParameters }));

    expect(notYours.statusCode).toBe(404);
    expect(notYours.body).toBe(missing.body);
    expect(notYours.body).not.toContain(surprise.title);
  });
});
