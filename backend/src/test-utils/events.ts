// Test helpers: build fake API Gateway requests for endpoint tests.
// Only used by *.test.ts files, never by the real endpoints.
import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import type { Surprise } from "@surpriseme/shared";

interface RequestOptions {
  userId?: string; // leave out to simulate "not logged in"
  body?: string;
  pathParameters?: Record<string, string>;
}

// A request to a logged-in endpoint. API Gateway puts the user id in claims.sub.
export function authedRequest(options: RequestOptions = {}): APIGatewayProxyEventV2WithJWTAuthorizer {
  return {
    body: options.body,
    pathParameters: options.pathParameters,
    requestContext: {
      authorizer: options.userId ? { jwt: { claims: { sub: options.userId }, scopes: [] } } : undefined,
    },
  } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer;
}

// A request to a public endpoint (no login at all).
export function publicRequest(pathParameters?: Record<string, string>): APIGatewayProxyEventV2 {
  return { pathParameters, requestContext: {} } as unknown as APIGatewayProxyEventV2;
}

// Reads the JSON body of an endpoint's answer.
export function bodyOf(res: APIGatewayProxyStructuredResultV2): any {
  return JSON.parse(res.body ?? "null");
}

// A ready-made surprise. Pass changes to override fields.
export function makeSurprise(changes: Partial<Surprise> = {}): Surprise {
  return {
    id: "0b6f8f9e-2c1d-4c3b-9a8e-1f2d3c4b5a69",
    ownerId: "user-123",
    title: "Happy 30th, Sam!",
    eventType: "birthday",
    revealStyle: "confetti",
    recipientName: "Sam",
    recipientEmail: "sam@example.com",
    deliverAt: "2030-12-01T09:00:00Z",
    status: "draft",
    createdAt: "2026-11-20T10:00:00.000Z",
    updatedAt: "2026-11-20T10:00:00.000Z",
    ...changes,
  };
}
