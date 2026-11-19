// The single place that answers "who is logged in?"
// Cognito + API Gateway check the login token BEFORE our code runs,
// and put the user's id in the request. We just read it.
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { unauthorized } from "./errors";

export function getUserId(event: APIGatewayProxyEventV2WithJWTAuthorizer): string {
  const userId = event.requestContext.authorizer?.jwt?.claims?.sub;
  if (typeof userId !== "string" || userId === "") throw unauthorized();
  return userId;
}