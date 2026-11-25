// POST /contribute/{token}/messages: PUBLIC. An invited friend adds a message.
// The invite token is their key. They can add messages and nothing else:
// they never see the surprise, the recipient, or anyone else's messages.

import { randomUUID } from "node:crypto";
import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { addMessageSchema, LIMITS, type Message } from "@surpriseme/shared";
import { getInviteByTokenHash } from "../../database/invites-db";
import { countMessages, saveMessage } from "../../database/messages-db";
import { getSurprise } from "../../database/surprises-db";
import { badRequest, json, notFound, toResponse } from "../../utils/errors";
import { logger } from "../../utils/logger";
import { parseJsonBody, parseToken } from "../../utils/request";
import { isDelivered } from "../../utils/time-gate";
import { hashToken } from "../../utils/tokens";

export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    // 1. Does the token look right, and does it match a live invite?
    const token = parseToken(event.pathParameters?.token);
    const invite = await getInviteByTokenHash(hashToken(token));
    if (!invite || new Date(invite.expiresAt).getTime() <= Date.now()) {
      logger.warn("invalid invite attempt");
      throw notFound("This invite was not found");
    }

    // 2. Does the surprise still exist?
    const surprise = await getSurprise(invite.surpriseId);
    if (!surprise || surprise.status === "cancelled") {
      logger.warn("invalid invite attempt");
      throw notFound("This invite was not found");
    }

    // 3. Too late once delivery time has passed.
    if (surprise.status === "delivered" || isDelivered(surprise.deliverAt)) {
      throw badRequest("It's too late to add a message to this surprise");
    }

    // 4. Validate the body with the shared rules.
    const parsed = addMessageSchema.safeParse(parseJsonBody(event.body));
    if (!parsed.success) {
      throw badRequest(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    // 5. Respect the limit.
    if ((await countMessages(surprise.id)) >= LIMITS.maxMessagesPerSurprise) {
      throw badRequest("This surprise already has the maximum number of messages");
    }

    // 6. Save. Log ids only, never the message text.
    const message: Message = {
      id: randomUUID(),
      surpriseId: surprise.id,
      ...parsed.data,
      createdAt: new Date().toISOString(),
    };
    await saveMessage(message);

    logger.info("message added", { surpriseId: surprise.id, messageId: message.id, by: "contributor" });
    // Send back almost nothing: a contributor must learn nothing about the surprise.
    return json(201, { id: message.id });
  } catch (err) {
    return toResponse(err);
  }
}