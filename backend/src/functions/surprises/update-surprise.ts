// Patch / surprises/{id}: the owner edits a surprise that hasn't been delivered yet

import type {
    APIGatewayProxyEventV2WithJWTAuthorizer,
    APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { updateSurpriseSchema } from "@surpriseme/shared";
import { getSurprise, updateSurpriseFields } from "../../database/surprises-db";
import { getUserId} from "../../utils/auth";
import { badRequest ,json, notFound, toResponse } from "../../utils/errors";
import { parseSurpriseId} from "../../utils/ids";
import { logger } from "../../utils/logger";

export async function handler(
    event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyStructuredResultV2> {
    try {
        // 1. who is asking, and which surprise?
        const userId = getUserId(event);
        const surpriseId = parseSurpriseId(event.pathParameters?.id);
        
        // 2. Only the owner. Missing or not yours:same 404
        const surprise = await getSurprise(surpriseId);
        if (!surprise || surprise.ownerId !== userId) {
            throw notFound("This Surprise was not found");
        }

        // 3. Delivered or cancelled surprises are locked
        if (surprise.status === "delivered" || surprise.status === "cancelled") {
            return badRequest(`A ${surprise.status} surprise can't be edited`);
        }

        // 4. Read and validate the changes (never trust the frontend)
        let body: unknown;
        try {
            body = JSON.parse(event.body ?? "");
        } catch {
            throw badRequest("Body must be valid JSON");
        }
        const parsed = updateSurpriseSchema.safeParse(body);
        if (!parsed.success) {
            throw badRequest(parsed.error.issues[0]?.message ?? "Invalid imput");
        }
        const changes = parsed.data;
        if(Object.keys(changes).length === 0){
            return badRequest("Nothing to update");
        }

        // 5. Save the changes. log the id and which fields changed, never the values.
        const updated = await updateSurpriseFields(surprise.id, changes);
        // TODO: when scheduled delivery exists, update the EventBridge schedule here
        // if deliverAt changed.
        logger.info("surprise updated", {
            surpriseId: updated.id,
            userId,
            fields: Object.keys(changes),
        });
        return json(200,updated);
    } catch (err) {
        return toResponse(err);
    }
}
