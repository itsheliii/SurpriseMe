// The ONLY place that reads/writes surprise items in DynamoDB.
// Knows nothing about HTTP, emails, or login.
import {GetCommand, PutCommand, QueryCommand} from "@aws-sdk/lib-dynamodb";
import type { Surprise } from "@surpriseme/shared";
import { db, getTableName } from "./client";


// This table stores extra key fields (PK, SK, GSI1SK) for lookups
// This removes them so the rest of the app only sees the Surprise fields, not the database keys.
function toSurprise(item: Record<string, any>): Surprise {
  const { PK, SK , GSI1PK, GSI1SK, ...surprise } = item; 
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

