// Tests for POST /surprises/{id}/share-link (create-share-link.ts).
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSurprise, setShareTokenHash } from "../../database/surprises-db";
import { authedRequest, bodyOf, makeSurprise } from "../../test-utils/events";
import { logger } from "../../utils/logger";
import { hashToken } from "../../utils/tokens";
import { handler } from "./create-share-link";

vi.mock("../../database/surprises-db");
vi.mock("../../utils/logger");

const surprise = makeSurprise();
const pathParameters = { id: surprise.id };

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("SITE_URL", "https://surpriseme.example");
});

describe("create-share-link", () => {
  it("rejects a request that is not logged in (401)", async () => {
    const res = await handler(authedRequest({ pathParameters }));
    expect(res.statusCode).toBe(401);
    expect(setShareTokenHash).not.toHaveBeenCalled();
  });

  it("rejects an invalid id (400)", async () => {
    const res = await handler(authedRequest({ userId: "user-123", pathParameters: { id: "abc" } }));
    expect(res.statusCode).toBe(400);
  });

  it("answers 404 and makes no link for a missing surprise or someone else's", async () => {
    vi.mocked(getSurprise).mockResolvedValue(null);
    expect((await handler(authedRequest({ userId: "user-123", pathParameters }))).statusCode).toBe(404);

    vi.mocked(getSurprise).mockResolvedValue(surprise);
    expect((await handler(authedRequest({ userId: "user-999", pathParameters }))).statusCode).toBe(404);

    expect(setShareTokenHash).not.toHaveBeenCalled();
  });

  it("returns a private link and saves only the token's hash (200)", async () => {
    vi.mocked(getSurprise).mockResolvedValue(surprise);
    const res = await handler(authedRequest({ userId: "user-123", pathParameters }));
    expect(res.statusCode).toBe(200);

    const { link } = bodyOf(res);
    const match = /^https:\/\/surpriseme\.example\/open\/([A-Za-z0-9_-]{43})$/.exec(link);
    expect(match).not.toBeNull();
    const token = match![1];

    expect(setShareTokenHash).toHaveBeenCalledWith(surprise.id, hashToken(token));
    expect(vi.mocked(setShareTokenHash).mock.calls[0][1]).not.toBe(token);
  });

  it("makes a new, different link each time", async () => {
    vi.mocked(getSurprise).mockResolvedValue(surprise);
    const first = bodyOf(await handler(authedRequest({ userId: "user-123", pathParameters }))).link;
    const second = bodyOf(await handler(authedRequest({ userId: "user-123", pathParameters }))).link;
    expect(first).not.toBe(second);
  });

  it("never writes the token or the link to the logs", async () => {
    vi.mocked(getSurprise).mockResolvedValue(surprise);
    const res = await handler(authedRequest({ userId: "user-123", pathParameters }));
    const link: string = bodyOf(res).link;
    const token = link.split("/").pop()!;

    const everythingLogged = JSON.stringify([
      vi.mocked(logger.info).mock.calls,
      vi.mocked(logger.warn).mock.calls,
      vi.mocked(logger.error).mock.calls,
    ]);
    expect(everythingLogged).not.toContain(token);
  });
});
