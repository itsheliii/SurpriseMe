// the ONLY place that reads/writes invite items to DynamoDB
// we store the HASH of the invite token, never the token itself

import {PutCommand, QueryCommand} from "@aws-sdk/lib-dynamodb";
import type {Invite} from '@surpriseme/shared';
import { db, getTableName } from "./client";

function toInvite(item: Record<string, unknown>): Invite {
    const { PK, SK, GSI2PK, GSI2SK, ...invite } = item;
    return invite as unknown as Invite;
  }
  
  export async function saveInvite(invite: Invite): Promise<void> {
    await db.send(
      new PutCommand({
        TableName: getTableName(),
        Item: {
          PK: `SURPRISE#${invite.surpriseId}`,
          SK: `INVITE#${invite.tokenHash}`,
          GSI2PK: `INVITE#${invite.tokenHash}`, // lets us find the invite from a link token
          GSI2SK: `SURPRISE#${invite.surpriseId}`,
          ...invite,
        },
        ConditionExpression: "attribute_not_exists(PK)",
      })
    );
  }
  
  // Finds an invite from a token hash (uses the GSI2 index). Null if no match.
export async function getInviteByTokenHash(tokenHash: string): Promise<Invite | null> {
    const result = await db.send(
      new QueryCommand({
        TableName: getTableName(),
        IndexName: "GSI2",
        KeyConditionExpression: "GSI2PK = :invite",
        ExpressionAttributeValues: { ":invite": `INVITE#${tokenHash}` },
        Limit: 1,
      })
    );
    const item = result.Items?.[0];
    return item ? toInvite(item) : null;
}