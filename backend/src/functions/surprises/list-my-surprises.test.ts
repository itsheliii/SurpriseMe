// Tests for GET /surprises (list-my-surprises.ts), the creator's dashboard.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listSurprisesByOwner } from "../../database/surprises-db";
import { authedRequest, bodyOf, makeSurprise } from "../../test-utils/events";
import { handler } from "./list-my-surprises";

vi.mock("../../database/surprises-db");
vi.mock("../../utils/logger");

beforeEach(() => {
  vi.resetAllMocks();
});

describe("list-my-surprises", () => {
  it("rejects a request that is not logged in (401)", async () => {
    const res = await handler(authedRequest());
    expect(res.statusCode).toBe(401);
    expect(listSurprisesByOwner).not.toHaveBeenCalled();
  });

  it("asks only for the logged-in user's surprises", async () => {
    vi.mocked(listSurprisesByOwner).mockResolvedValue([]);
    await handler(authedRequest({ userId: "user-123" }));
    expect(listSurprisesByOwner).toHaveBeenCalledWith("user-123");
  });

  it("returns the list (200)", async () => {
    const surprises = [makeSurprise(), makeSurprise({ id: "1c2d3e4f-0000-4000-8000-000000000000" })];
    vi.mocked(listSurprisesByOwner).mockResolvedValue(surprises);
    const res = await handler(authedRequest({ userId: "user-123" }));
    expect(res.statusCode).toBe(200);
    expect(bodyOf(res)).toEqual({ surprises });
  });

  it("answers 500 without details when the database fails", async () => {
    vi.mocked(listSurprisesByOwner).mockRejectedValue(new Error("DynamoDB is down"));
    const res = await handler(authedRequest({ userId: "user-123" }));
    expect(res.statusCode).toBe(500);
    expect(res.body).not.toContain("DynamoDB");
  });
});
