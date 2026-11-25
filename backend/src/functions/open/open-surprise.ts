// GET /open/{Token} : PUBLIC. the recipient opens their surprise
// Before deliverAt, the server returns the coutdown ONLY and nothing else

import type{
    APIGatewayProxyEventV2,
    APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { z} from "zod";
import type { OpenSurpriseResponse } from "@surpriseme/shared";
import { getSurpriseByTokenHash } from "../../database/surprises-db";
import {json, notFound, toResponse} from "../../utils/errors";
import {logger} from "../../utils/logger";
import { hashToken } from "../../utils/tokens";
import { isDelivered } from "../../utils/time-gate";
import { listMessages } from "../../database/messages-db"; 
// Our tokens are 32 random bytes, base64url-encoded = exeactly 43 characters

const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

export async function handler(
    event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> {

    try{
        const parsed = tokenSchema.safeParse(event.pathParameters?.token);
        if(!parsed.success) {
            logger.warn("invalid token attempt");
            throw notFound("This Surprise was not found");
        }

        const surprise = await getSurpriseByTokenHash(hashToken(parsed.data));
        if(!surprise || surprise.status === "cancelled") {
            logger.warn("invalid token attempt");
            throw notFound("This Surprise was not found");
        }

        //3. THE time gate. The server decides. the Frontend cant be tricked into showing more
        if(!isDelivered(surprise.deliverAt)){
            const countdown: OpenSurpriseResponse = {
                state: "countdown",
                deliverAt: surprise.deliverAt,
                recipientName: surprise.recipientName,
            };
            return json(200, countdown);
        }

        // 4. Delievered: return the full surprise
        // TODO: photo links and gift cards get added once those features are implemented
        const messages = await listMessages(surprise.id);
        const opened: OpenSurpriseResponse = {
            state: "open",
            title: surprise.title,
            eventType: surprise.eventType,
            revealStyle: surprise.revealStyle,
            recipientName: surprise.recipientName,
            messages: messages.map((m) => ({
                id: m.id,
                authorName: m.authorName,
                // A message with a future unlock time stays empty until then (server decides).
                text: m.unlockAt && !isDelivered(m.unlockAt) ? "" : m.text,
                hidden: m.hidden,
                unlockAt: m.unlockAt,
            })),
            photoUrls: [],
            giftCards: [],
        };
        logger.info("surprise opened", {surpriseId: surprise.id});
        return json(200, opened);

    } catch(err){
        return toResponse(err);
    }

}
