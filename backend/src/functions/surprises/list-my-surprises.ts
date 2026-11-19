// GET / Surprises: the dashboard. Returns only rhe logged-in user's surprises.
// APIGatewayProxyEventV2WithJWTAuthorizer => The shape of the incoming request (who sent it, the body, headers). It only helps TypeScript catch mistakes.
// APIGatewayProxyStructuredResultV2 =>	The shape of the reply we must return (status code, body)
import type {
    APIGatewayProxyEventV2WithJWTAuthorizer,
    APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { listSurprisesByOwner } from "../../database/surprises-db";
import { getUserId } from "../../utils/auth";
import { json, toResponse } from "../../utils/errors";
import {logger} from "../../utils/logger";

export async function handler(
    event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyStructuredResultV2> {
    try{
        // 1. who is asking? We only ever list THEIR surprises.
        const ownerId = getUserId(event);

        // 2. load them
        const surprises = await listSurprisesByOwner(ownerId);

        // 3. log counts and reply
        logger.info("surprises listed", {ownerId, count: surprises.length});
        return json(200, {surprises});

    } catch (err) {
        return toResponse(err);
    }
    
}