// The ONLY place that reads/writes surprise items in DynamoDB.
// Knows nothing about HTTP, emails, or login.
import {GetCommand, PutCommand, QueryCommand, UpdateCommand} from "@aws-sdk/lib-dynamodb";
import type { Surprise } from "@surpriseme/shared";
import { db, getTableName } from "./client";


// The table stores extra key fields for lookups, plus the token hash.
// This removes them so the rest of the app only sees a clean Surprise.
// The token hash must NEVER leave the database layer.
function toSurprise(item: Record<string, unknown>): Surprise {
  const { PK, SK , GSI1PK, GSI1SK, GSI2PK, GSI2SK, shareTokenHash, ...surprise } = item; 
  return surprise as unknown as Surprise;
}

export async function saveSurprise(surprise: Surprise): Promise<void> {
  await db.send(
    new PutCommand({
      TableName: getTableName(),
      Item: {
        PK: `SURPRISE#${surprise.id}`, // main key: which surprise
        SK: "META",                    // sort key: the main info item
        GSI1PK: `OWNER#${surprise.ownerId}`,   // lets the dashboard list "my surprises"
        GSI1SK: `SURPRISE#${surprise.createdAt}`,
        ...surprise,
      },
      // Safety: never overwrite an existing surprise by accident.
      ConditionExpression: "attribute_not_exists(PK)",
    })
  );
}


// Returns the surprise, or null if it doesn't exist.
export async function getSurprise(id: string) : Promise<Surprise | null> {
  const result = await db.send(
    new GetCommand({
      TableName: getTableName(),
      Key: { PK: `SURPRISE#${id}`, SK: "META" },
    })
  );
  return result.Item ? toSurprise(result.Item) : null;
}

// All Surprises owned by one user, newest first (uses the GSI1 index).
export async function listSurprisesByOwner(ownerId: string): Promise<Surprise[]> {
  const result = await db.send(
    new QueryCommand({
      TableName: getTableName(),
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :ownerId",
      ExpressionAttributeValues: {
        ":ownerId": `OWNER#${ownerId}`,
      },
      ScanIndexForward: false, // newest first
    })
  );
  return (result.Items?? []).map(toSurprise);
}

// Saves the HASH of the private link token on the surprise
// Replacing it makes an older link stop working.
export async function setShareTokenHash(id: string, tokenHash: string): Promise<void> {
  await db.send(
    new UpdateCommand({
      TableName: getTableName(),
      Key: { PK: `SURPRISE#${id}`, SK: "META" },
      UpdateExpression: "SET shareTokenHash = :hash, GSI2PK = :gsi2pk, GSI2SK = :gsi2sk, updatedAt = :now",
      ConditionExpression: "attribute_exists(PK)", // must already exist
      ExpressionAttributeValues: {
        ":hash": tokenHash,
        ":gsi2pk": `SHARE#${tokenHash}`, // lets us find the surprsie of a token
        ":gsi2sk": `SURPRISE#${id}`,
        ":now": new Date().toISOString(),
      },
    })
  )
}


// Finds a surprise from a token hash (uses the GSI2 index). Null if no match.
export async function getSurpriseByTokenHash(tokenHash: string): Promise<Surprise | null> {
  const result = await db.send(
    new QueryCommand({
      TableName: getTableName(),
      IndexName: "GSI2",
      KeyConditionExpression: "GSI2PK = :token",
      ExpressionAttributeValues: { ":token": `SHARE#${tokenHash}` },
      Limit: 1,
    })
  );
  const item = result.Items?.[0];
  return item ? toSurprise(item) : null;
}