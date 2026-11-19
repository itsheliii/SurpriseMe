// POST /surprises/{id}/share-link: the owner creates the private link for the recipient.
import type {
    APIGatewayProxyEventV2WithJWTAuthorizer,
    APIGatewayProxyStructuredResultV2,
  } from "aws-lambda";
  import { getSurprise, setShareTokenHash } from "../../database/surprises-db";
  import { getUserId } from "../../utils/auth";
  import { json, notFound, toResponse } from "../../utils/errors";
  import { parseSurpriseId } from "../../utils/ids";
  import { logger } from "../../utils/logger";
  import { generateToken, hashToken } from "../../utils/tokens";
  
  export async function handler(
    event: APIGatewayProxyEventV2WithJWTAuthorizer
  ): Promise<APIGatewayProxyStructuredResultV2> {
    try {
      // 1. Who is asking, and which surprise?
      const userId = getUserId(event);
      const surpriseId = parseSurpriseId(event.pathParameters?.id);
  
      // 2. Only the owner can make a link. Missing or not yours: same 404 answer.
      const surprise = await getSurprise(surpriseId);
      if (!surprise || surprise.ownerId !== userId) throw notFound("Surprise not found");
  
      // 3. Make a random token. Save only its HASH.
      const token = generateToken();
      await setShareTokenHash(surprise.id, hashToken(token));
  
      // 4. Build the link. This is the ONLY time the real token exists.
      const siteUrl = process.env.SITE_URL ?? "http://localhost:5173";
      const link = `${siteUrl}/open/${token}`;
  
      // Log the surprise id only, never the token or the link.
      logger.info("share link created", { surpriseId: surprise.id, userId });
      return json(200, { link });
    } catch (err) {
      return toResponse(err);
    }
  }