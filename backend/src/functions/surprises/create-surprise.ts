// POST /surprises: a logged-in user creates a new surprise (starts as a draft).
import { randomUUID } from "node:crypto";
import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { createSurpriseSchema, type Surprise } from "@surpriseme/shared";
import { saveSurprise } from "../../database/surprises-db";
import { getUserId } from "../../utils/auth";
import { badRequest, json, toResponse } from "../../utils/errors";
import { logger } from "../../utils/logger";

export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    // 1. Who is asking?
    const ownerId = getUserId(event);

    // 2. Read the body safely (it arrives as text, and could be junk).
    let body: unknown;
    try {
      body = JSON.parse(event.body ?? "");
    } catch {
      throw badRequest("Body must be valid JSON");
    }

    // 3. Validate with the shared rules. Never trust the frontend.
    const parsed = createSurpriseSchema.safeParse(body);
    if (!parsed.success) {
      throw badRequest(parsed.error.issues[0]?.message ?? "Invalid input");
    }
    const input = parsed.data;

    // 4. Business rule: delivery must be in the future.
    if (new Date(input.deliverAt).getTime() <= Date.now()) {
      throw badRequest("deliverAt must be in the future");
    }

    // 5. Build the surprise and save it.
    const now = new Date().toISOString();
    const surprise: Surprise = {
      id: randomUUID(),
      ownerId,
      ...input,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    };
    await saveSurprise(surprise);

    // 6. Log IDs only, then reply.
    logger.info("surprise created", { surpriseId: surprise.id, ownerId });
    return json(201, surprise);
  } catch (err) {
    return toResponse(err);
  }
}