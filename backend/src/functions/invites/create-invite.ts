// POST /surprises/{id}/invites: the owner creates a link friends use to add messages.
import type {
    APIGatewayProxyEventV2WithJWTAuthorizer,
    APIGatewayProxyStructuredResultV2,
  } from "aws-lambda";
  import type { Invite } from "@surpriseme/shared";
  import { saveInvite } from "../../database/invites-db";
  import { getSurprise } from "../../database/surprises-db";
  import { getUserId } from "../../utils/auth";
  import { badRequest, json, notFound, toResponse } from "../../utils/errors";
  import { parseSurpriseId } from "../../utils/ids";
  import { logger } from "../../utils/logger";
  import { generateToken, hashToken } from "../../utils/tokens";
  
  const INVITE_DAYS = 30;
  
  export async function handler(
    event: APIGatewayProxyEventV2WithJWTAuthorizer
  ): Promise<APIGatewayProxyStructuredResultV2> {
    try {
      // 1. Who is asking, and which surprise?
      const userId = getUserId(event);
      const surpriseId = parseSurpriseId(event.pathParameters?.id);
  
      // 2. Only the owner. Missing or not yours: same 404.
      const surprise = await getSurprise(surpriseId);
      if (!surprise || surprise.ownerId !== userId) throw notFound("Surprise not found");
  
      // 3. Pointless to invite friends once it is delivered or cancelled.
      if (surprise.status === "delivered" || surprise.status === "cancelled") {
        throw badRequest(`A ${surprise.status} surprise can't get new invites`);
      }
  
      // 4. Make a random token. Save only its HASH.
      const token = generateToken();
      const now = new Date();
      const invite: Invite = {
        surpriseId: surprise.id,
        tokenHash: hashToken(token),
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + INVITE_DAYS * 24 * 60 * 60 * 1000).toISOString(),
      };
      await saveInvite(invite);
  
      // 5. Build the link. This is the ONLY time the real token exists.
      const siteUrl = process.env.SITE_URL ?? "http://localhost:5173";
      const link = `${siteUrl}/contribute/${token}`;
  
      // Log the surprise id only, never the token or the link.
      logger.info("invite created", { surpriseId: surprise.id, userId });
      return json(201, { link, expiresAt: invite.expiresAt });
    } catch (err) {
      return toResponse(err);
    }
  }