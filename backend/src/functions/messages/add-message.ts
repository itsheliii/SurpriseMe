// POST /surprises/ {id}/ messages: the owner adds a message to theoir own surprise 

import { randomUUID } from "node:crypto";
import type {
    APIGatewayProxyEventV2WithJWTAuthorizer,
    APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { addMessageSchema, LIMITS, type Message } from "@surpriseme/shared";
import { countMessages, saveMessage } from "../../database/messages-db";
import { getSurprise } from "../../database/surprises-db";
import { getUserId } from "../../utils/auth";
import { badRequest, json, notFound, toResponse } from "../../utils/errors";
import { parseSurpriseId } from "../../utils/ids";
import { logger } from "../../utils/logger";
import { parseJsonBody } from "../../utils/request";

export async function handler(
    event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyStructuredResultV2> {
    try {
        // 1. who is asking, and which surprise?
        const userId = getUserId(event);
        const surpriseId = parseSurpriseId(event.pathParameters?.id);

        // 2. Only the owner. Missing or not yours: same 404
        const surprise = await getSurprise(surpriseId);
        if (!surprise || surprise.ownerId !== userId) {
            throw notFound("This Surprise was not found");
        }

        // 3. No new messages once it is delivered or cancelled
        if (surprise.status === "delivered" || surprise.status === "cancelled") {
            throw badRequest(`A ${surprise.status} surprise can't get new messages `);
        }

        // 4. Validate the body with the shared rules
        const parsed = addMessageSchema.safeParse(parseJsonBody(event.body));
        if (!parsed.success) {
            throw badRequest(parsed.error.issues[0]?.message ?? "Invalid input");
        }

        // 5. Respect the limit
        if ((await countMessages(surprise.id)) >= LIMITS.maxMessagesPerSurprise) {
            throw badRequest(" This Surprise already has the maximum number of messages");
        }

        // 6. Save. Log ids only, never the message test
        const message: Message = {
            id: randomUUID(),
            surpriseId: surprise.id,
            ...parsed.data,
            createdAt: new Date().toISOString(),
        };
        await saveMessage(message);
        logger.info("message added", { surpriseId: surprise.id, messageId: message.id, by: "owner" });
        return json(201, message);
    } catch (err) {
        return toResponse(err);
    }
}