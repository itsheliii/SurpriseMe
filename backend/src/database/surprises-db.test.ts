// Tests for the database layer (surprises-db.ts).
// We never talk to the real DynamoDB here: aws-sdk-client-mock catches every
// request, so we can check exactly what WOULD be sent to AWS, and fake the answers.
import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { Surprise } from "@surpriseme/shared";
import { mockClient } from "aws-sdk-client-mock";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, getTableName } from "./client";
import {
  getSurprise,
  getSurpriseByTokenHash,
  listSurprisesByOwner,
  saveSurprise,
  setShareTokenHash,
} from "./surprises-db";

const dbMock = mockClient(db);

const surprise: Surprise = {
  id: "0b6f8f9e-2c1d-4c3b-9a8e-1f2d3c4b5a69",
  ownerId: "user-123",
  title: "Happy 30th, Sam!",
  eventType: "birthday",
  revealStyle: "confetti",
  recipientName: "Sam",
  deliverAt: "2030-12-01T09:00:00Z",
  status: "draft",
  createdAt: "2026-11-20T10:00:00.000Z",
  updatedAt: "2026-11-20T10:00:00.000Z",
};

// How a surprise looks inside the table: the surprise plus key fields and the token hash.
const storedItem = {
  PK: `SURPRISE#${surprise.id}`,
  SK: "META",
  GSI1PK: `OWNER#${surprise.ownerId}`,
  GSI1SK: `SURPRISE#${surprise.createdAt}`,
  GSI2PK: "SHARE#abc",
  GSI2SK: `SURPRISE#${surprise.id}`,
  shareTokenHash: "abc",
  ...surprise,
};

// DynamoDB rejects a request if an expression uses a :placeholder that has no value,
// or a value is given that the expression never uses. This checks both directions.
function expectPlaceholdersMatch(input: {
  UpdateExpression?: string;
  ConditionExpression?: string;
  KeyConditionExpression?: string;
  ExpressionAttributeValues?: Record<string, unknown>;
}) {
  const expressions = [input.UpdateExpression, input.ConditionExpression, input.KeyConditionExpression].join(" ");
  const used = new Set(expressions.match(/:[A-Za-z0-9_]+/g) ?? []);
  const given = new Set(Object.keys(input.ExpressionAttributeValues ?? {}));
  expect([...used].sort()).toEqual([...given].sort());
}

beforeEach(() => {
  dbMock.reset();
  vi.stubEnv("TABLE_NAME", "surpriseme-test");
});

describe("getTableName", () => {
  it("reads the table name from the TABLE_NAME setting", () => {
    expect(getTableName()).toBe("surpriseme-test");
  });

  it("fails clearly when TABLE_NAME is not set", () => {
    vi.stubEnv("TABLE_NAME", "");
    expect(() => getTableName()).toThrow("TABLE_NAME is not set");
  });
});

describe("saveSurprise", () => {
  it("saves the surprise with its keys, and never overwrites an existing one", async () => {
    dbMock.on(PutCommand).resolves({});
    await saveSurprise(surprise);

    const input = dbMock.commandCalls(PutCommand)[0].args[0].input;
    expect(input.TableName).toBe("surpriseme-test");
    expect(input.Item).toMatchObject({
      PK: `SURPRISE#${surprise.id}`,
      SK: "META",
      GSI1PK: "OWNER#user-123",
      GSI1SK: `SURPRISE#${surprise.createdAt}`,
      ...surprise,
    });
    expect(input.ConditionExpression).toBe("attribute_not_exists(PK)");
  });
});

describe("getSurprise", () => {
  it("returns a clean surprise, without table keys or the token hash", async () => {
    dbMock.on(GetCommand).resolves({ Item: storedItem });
    const result = await getSurprise(surprise.id);

    expect(result).toEqual(surprise);
    expect(dbMock.commandCalls(GetCommand)[0].args[0].input.Key).toEqual({
      PK: `SURPRISE#${surprise.id}`,
      SK: "META",
    });
  });

  it("returns null when the surprise does not exist", async () => {
    dbMock.on(GetCommand).resolves({});
    expect(await getSurprise(surprise.id)).toBeNull();
  });
});

describe("listSurprisesByOwner", () => {
  it("asks the GSI1 index for this owner's surprises, newest first", async () => {
    dbMock.on(QueryCommand).resolves({ Items: [storedItem] });
    const result = await listSurprisesByOwner("user-123");

    expect(result).toEqual([surprise]);
    const input = dbMock.commandCalls(QueryCommand)[0].args[0].input;
    expect(input.IndexName).toBe("GSI1");
    expect(input.ExpressionAttributeValues).toEqual({ ":ownerId": "OWNER#user-123" });
    expect(input.ScanIndexForward).toBe(false);
    expectPlaceholdersMatch(input);
  });

  it("returns an empty list when the owner has no surprises", async () => {
    dbMock.on(QueryCommand).resolves({});
    expect(await listSurprisesByOwner("user-123")).toEqual([]);
  });
});

describe("setShareTokenHash", () => {
  it("sends a request DynamoDB will accept (every :placeholder has a value)", async () => {
    dbMock.on(UpdateCommand).resolves({});
    await setShareTokenHash(surprise.id, "hash-1");

    expectPlaceholdersMatch(dbMock.commandCalls(UpdateCommand)[0].args[0].input);
  });

  it("stores the hash and the GSI2 lookup key, only on an existing surprise", async () => {
    dbMock.on(UpdateCommand).resolves({});
    await setShareTokenHash(surprise.id, "hash-1");

    const input = dbMock.commandCalls(UpdateCommand)[0].args[0].input;
    expect(input.Key).toEqual({ PK: `SURPRISE#${surprise.id}`, SK: "META" });
    expect(input.ExpressionAttributeValues).toMatchObject({
      ":hash": "hash-1",
      ":gsi2pk": "SHARE#hash-1",
      ":gsi2sk": `SURPRISE#${surprise.id}`,
    });
    expect(input.ConditionExpression).toBe("attribute_exists(PK)");
  });
});

describe("getSurpriseByTokenHash", () => {
  it("finds a link with the same key that setShareTokenHash saved", async () => {
    dbMock.on(UpdateCommand).resolves({});
    dbMock.on(QueryCommand).resolves({ Items: [storedItem] });

    await setShareTokenHash(surprise.id, "hash-1");
    await getSurpriseByTokenHash("hash-1");

    const saved = dbMock.commandCalls(UpdateCommand)[0].args[0].input.ExpressionAttributeValues?.[":gsi2pk"];
    const query = dbMock.commandCalls(QueryCommand)[0].args[0].input;
    expect(query.IndexName).toBe("GSI2");
    expect(Object.values(query.ExpressionAttributeValues ?? {})).toEqual([saved]);
    expectPlaceholdersMatch(query);
  });

  it("returns a clean surprise when the link matches", async () => {
    dbMock.on(QueryCommand).resolves({ Items: [storedItem] });
    expect(await getSurpriseByTokenHash("abc")).toEqual(surprise);
  });

  it("returns null when no surprise has that link", async () => {
    dbMock.on(QueryCommand).resolves({ Items: [] });
    expect(await getSurpriseByTokenHash("unknown")).toBeNull();
  });
});
