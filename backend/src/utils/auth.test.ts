// Tests for "who is logged in?": the user id comes from the login token
// that API Gateway already checked. No id means not signed in.
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { describe, expect, it } from "vitest";
import { getUserId } from "./auth";
import { AppError } from "./errors";

// Builds just enough of a request for getUserId to read.
function requestWithClaims(claims: Record<string, unknown> | undefined) {
  return {
    requestContext: { authorizer: claims ? { jwt: { claims, scopes: [] } } : undefined },
  } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer;
}

describe("getUserId", () => {
  it("returns the user id (sub) from the login token", () => {
    expect(getUserId(requestWithClaims({ sub: "user-123" }))).toBe("user-123");
  });

  it("rejects a request with no login, an empty id, or a non-text id with 401", () => {
    for (const claims of [undefined, {}, { sub: "" }, { sub: 123 }]) {
      try {
        getUserId(requestWithClaims(claims));
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).statusCode).toBe(401);
      }
    }
  });
});
