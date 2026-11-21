// Delete /surprises/{id}: the owner cancels a surprise
// "cancel" keeps the record (status = "cancelled") and kills the link
// open-surprise already answers 404 for cancelled surprises

import {
    APIGatewayProxyEventV2WithJWTAuthorizer,
    APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { getSurprise, setSurpriseStatus } from "../../database/surprises-db";
import {getUserId} from "../../utils/auth";
import { notFound, toResponse } from "../../utils/errors";
import { parseSurpriseId } from "../../utils/ids";
import { logger } from "../../utils/logger";

export async function handler(
    event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyStructuredResultV2> {
    try {
        // 1. who is asking, and which surprise?
        const userId = getUserId(event);
        const surpriseId = parseSurpriseId(event.pathParameters?.id);

        // Only the owner. Missing or not yours: same 404
        const surprise = await getSurprise(surpriseId);
        if (!surprise || surprise.ownerId !== userId) {
            throw notFound("This Surprise was not found");
        }

        await setSurpriseStatus(surprise.id, "cancelled");
        // TODO: delete the EventBridge schedule here for once scheduled delivery exists

        logger.info("surprise cancelled", {surpriseId: surprise.id, userId});
        return{ statusCode: 204 }; // this is successful delete, no content
    } catch (err) {
        return toResponse(err);
    }
}