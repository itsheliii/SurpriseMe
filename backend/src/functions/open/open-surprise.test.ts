// Tests for GET /open/{token} (open-surprise.ts), the PUBLIC recipient page.
// The most important rule: before delivery time, nothing but the countdown leaks out.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSurpriseByTokenHash } from "../../database/surprises-db";
import { bodyOf, makeSurprise, publicRequest } from "../../test-utils/events";
import { generateToken, hashToken } from "../../utils/tokens";
import { handler } from "./open-surprise";
import {listMessages} from "../../database/messages-db";


vi.mock("../../database/surprises-db");
vi.mock("../../database/messages-db");
vi.mock("../../utils/logger");

const token = generateToken();
const surprise = makeSurprise({ deliverAt: "2030-12-01T09:00:00Z" });

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(listMessages).mockResolvedValue([]);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("open-surprise", () => {
  it("answers 404 for a badly shaped token, without asking the database", async () => {
    for (const bad of [undefined, "", "short", "x".repeat(44), "!".repeat(43)]) {
      const res = await handler(publicRequest(bad === undefined ? undefined : { token: bad }));
      expect(res.statusCode).toBe(404);
    }
    expect(getSurpriseByTokenHash).not.toHaveBeenCalled();
  });

  it("looks the surprise up by the token's hash, never the token itself", async () => {
    vi.mocked(getSurpriseByTokenHash).mockResolvedValue(null);
    await handler(publicRequest({ token }));
    expect(getSurpriseByTokenHash).toHaveBeenCalledWith(hashToken(token));
  });

  it("answers 404 for an unknown link", async () => {
    vi.mocked(getSurpriseByTokenHash).mockResolvedValue(null);
    const res = await handler(publicRequest({ token }));
    expect(res.statusCode).toBe(404);
  });

  it("answers 404 for a cancelled surprise, even after delivery time", async () => {
    vi.setSystemTime(new Date("2031-01-01T00:00:00Z"));
    vi.mocked(getSurpriseByTokenHash).mockResolvedValue({ ...surprise, status: "cancelled" });
    const res = await handler(publicRequest({ token }));
    expect(res.statusCode).toBe(404);
  });

  it("before delivery time, returns ONLY the countdown fields", async () => {
    vi.setSystemTime(new Date("2030-12-01T08:59:59Z"));
    vi.mocked(getSurpriseByTokenHash).mockResolvedValue(surprise);
    const res = await handler(publicRequest({ token }));

    expect(res.statusCode).toBe(200);
    expect(bodyOf(res)).toEqual({
      state: "countdown",
      deliverAt: surprise.deliverAt,
      recipientName: surprise.recipientName,
    });
    expect(res.body).not.toContain(surprise.title);
  });

  it("at delivery time, opens the surprise", async () => {
    vi.setSystemTime(new Date("2030-12-01T09:00:00Z"));
    vi.mocked(getSurpriseByTokenHash).mockResolvedValue(surprise);
    const res = await handler(publicRequest({ token }));

    expect(res.statusCode).toBe(200);
    expect(bodyOf(res)).toEqual({
      state: "open",
      title: surprise.title,
      eventType: surprise.eventType,
      revealStyle: surprise.revealStyle,
      recipientName: surprise.recipientName,
      messages: [],
      photoUrls: [],
      giftCards: [],
    });
  });

  it("never shows the owner id or the recipient's email, even when open", async () => {
    vi.setSystemTime(new Date("2031-01-01T00:00:00Z"));
    vi.mocked(getSurpriseByTokenHash).mockResolvedValue(surprise);
    const res = await handler(publicRequest({ token }));
    expect(res.body).not.toContain(surprise.ownerId);
    expect(res.body).not.toContain("sam@example.com");
  });

  it("answers 500 without details when the database fails", async () => {
    vi.mocked(getSurpriseByTokenHash).mockRejectedValue(new Error("DynamoDB is down"));
    const res = await handler(publicRequest({ token }));
    expect(res.statusCode).toBe(500);
    expect(res.body).not.toContain("DynamoDB");
  });
});
