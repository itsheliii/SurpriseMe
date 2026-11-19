// Get / surprises/ {id} : one surprise, but only for its ownner.
import type{
    APIGatewayProxyEventV2WithJWTAuthorizer,
    APIGatewayProxyStructuredResultV2, 
} from "aws-lambda";
import {z} from "zod";
import { getSurprise } from "../../database/surprises-db";
import { getUserId } from "../../utils/auth";
import { badRequest, json, notFound, toResponse } from "../../utils/errors";
import {logger} from "../../utils/logger";

const idSchema = z.string().uuid();

export async function handler(
    event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyStructuredResultV2> {
    try{
        // 1. who is asking? We only ever return THEIR surprises.
        const userId = getUserId(event);

       // 2. check if the id in the url is valid (never trust the URL either)
       const parseId = idSchema.safeParse(event.pathParameters?.id);
       if(!parseId.success) throw badRequest("Invalid surprise id");

       // 3. load the surprise
       const surprise = await getSurprise(parseId.data);
    
       // 4. Missing OR not yours: same answer  (404)
       // " 403 forbidden" would tell strangers that the surprise exists, so we don't do that.
       if (!surprise || surprise.ownerId !== userId) throw notFound("Surprise not found");

       logger.info("surprise fetched", {surpriseId: surprise.id, userId});
       return json(200, {surprise});
       
    }catch(err){
        return toResponse(err);
    }
}