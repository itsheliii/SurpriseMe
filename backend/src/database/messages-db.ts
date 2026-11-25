// the only place that reads/writes message in DynamoDB
// knows nothing about HTTP, emails, or login

import {PutCommand, QueryCommand} from "@aws-sdk/lib-dynamodb";
import type {Message} from '@surpriseme/shared';
import { db, getTableName } from "./client";

// Remove the databasr key fields so the rest of the app  sees a clean Message
function toMessage(item: Record<string, unknown>): Message {
    const {pk, sk, ...message} = item;
    return message as unknown as Message;
}

export async function saveMessage(message: Message): Promise<void> {
    await db.send(
      new PutCommand({
        TableName: getTableName(),
        Item: {
          PK: `SURPRISE#${message.surpriseId}`, // same drawer as the surprise itself
          SK: `MSG#${message.createdAt}#${message.id}`, // time first, so they list oldest-first
          ...message,
        },
        ConditionExpression: "attribute_not_exists(PK)",
      })
    );
}

// All messages of one surprise, oldest first.
export async function listMessages(surpriseId: string): Promise<Message[]> {
    const result = await db.send(
      new QueryCommand({
        TableName: getTableName(),
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
        ExpressionAttributeValues: {
          ":pk": `SURPRISE#${surpriseId}`,
          ":prefix": "MSG#",
        },
      })
    );
    return (result.Items ?? []).map(toMessage);
  }
  
  // How many messages a surprise has (used for the limit).
export async function countMessages(surpriseId: string): Promise<number> {
    const result = await db.send(
      new QueryCommand({
        TableName: getTableName(),
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
        ExpressionAttributeValues: {
          ":pk": `SURPRISE#${surpriseId}`,
          ":prefix": "MSG#",
        },
        Select: "COUNT",
      })
    );
    return result.Count ?? 0;
}