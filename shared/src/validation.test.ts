// Tests for the shared input rules (validation.ts).
// These rules protect the backend, so we check both sides:
// good input is accepted, and bad input is rejected.
import { describe, expect, it } from "vitest";
import {
  addGiftCardSchema,
  addMessageSchema,
  createSurpriseSchema,
  uploadUrlRequestSchema,
} from "./validation";
import { LIMITS } from "./constants";

// A valid "create surprise" request. Each test changes one thing.
const validSurprise = {
  title: "Happy 30th, Sam!",
  eventType: "birthday",
  revealStyle: "confetti",
  recipientName: "Sam",
  recipientEmail: "sam@example.com",
  recipientPhone: "+16175551234",
  deliverAt: "2030-12-01T09:00:00Z",
};

describe("createSurpriseSchema", () => {
  it("accepts a valid surprise", () => {
    expect(createSurpriseSchema.safeParse(validSurprise).success).toBe(true);
  });

  it("accepts a surprise without email and phone (both optional)", () => {
    const { recipientEmail, recipientPhone, ...rest } = validSurprise;
    expect(createSurpriseSchema.safeParse(rest).success).toBe(true);
  });

  it("trims spaces around the title", () => {
    const result = createSurpriseSchema.parse({ ...validSurprise, title: "  Hi  " });
    expect(result.title).toBe("Hi");
  });

  it("rejects an empty or spaces-only title", () => {
    expect(createSurpriseSchema.safeParse({ ...validSurprise, title: "" }).success).toBe(false);
    expect(createSurpriseSchema.safeParse({ ...validSurprise, title: "   " }).success).toBe(false);
  });

  it("rejects a title longer than the limit", () => {
    const title = "a".repeat(LIMITS.titleMaxLength + 1);
    expect(createSurpriseSchema.safeParse({ ...validSurprise, title }).success).toBe(false);
  });

  it("rejects an unknown event type or reveal style", () => {
    expect(createSurpriseSchema.safeParse({ ...validSurprise, eventType: "funeral" }).success).toBe(false);
    expect(createSurpriseSchema.safeParse({ ...validSurprise, revealStyle: "explode" }).success).toBe(false);
  });

  it("rejects a bad email", () => {
    expect(createSurpriseSchema.safeParse({ ...validSurprise, recipientEmail: "not-an-email" }).success).toBe(false);
  });

  it("rejects a phone number that is not in international format", () => {
    for (const phone of ["6175551234", "+0123456789", "+1 617 555 1234", "+12"]) {
      expect(createSurpriseSchema.safeParse({ ...validSurprise, recipientPhone: phone }).success).toBe(false);
    }
  });

  it("rejects a delivery time that is not a full ISO date-time", () => {
    for (const deliverAt of ["2030-12-01", "tomorrow", ""]) {
      expect(createSurpriseSchema.safeParse({ ...validSurprise, deliverAt }).success).toBe(false);
    }
  });

  it("rejects a request with a missing required field", () => {
    const { recipientName, ...rest } = validSurprise;
    expect(createSurpriseSchema.safeParse(rest).success).toBe(false);
  });
});

describe("addMessageSchema", () => {
  it("accepts a message and sets hidden to false by default", () => {
    const result = addMessageSchema.parse({ authorName: "Alex", text: "Happy birthday!" });
    expect(result.hidden).toBe(false);
  });

  it("rejects an empty message or one over the length limit", () => {
    expect(addMessageSchema.safeParse({ authorName: "Alex", text: "" }).success).toBe(false);
    const text = "a".repeat(LIMITS.messageMaxLength + 1);
    expect(addMessageSchema.safeParse({ authorName: "Alex", text }).success).toBe(false);
  });
});

describe("uploadUrlRequestSchema", () => {
  it("accepts an allowed image type under the size limit", () => {
    expect(uploadUrlRequestSchema.safeParse({ contentType: "image/png", sizeBytes: 1000 }).success).toBe(true);
  });

  it("rejects other file types", () => {
    expect(uploadUrlRequestSchema.safeParse({ contentType: "image/gif", sizeBytes: 1000 }).success).toBe(false);
  });

  it("rejects files over the size limit, and zero or negative sizes", () => {
    for (const sizeBytes of [LIMITS.maxPhotoSizeBytes + 1, 0, -5]) {
      expect(uploadUrlRequestSchema.safeParse({ contentType: "image/png", sizeBytes }).success).toBe(false);
    }
  });
});

describe("addGiftCardSchema", () => {
  it("accepts a store and a code, PIN optional", () => {
    expect(addGiftCardSchema.safeParse({ storeName: "Bookshop", code: "ABCD-1234" }).success).toBe(true);
  });

  it("rejects a code that is too short", () => {
    expect(addGiftCardSchema.safeParse({ storeName: "Bookshop", code: "AB" }).success).toBe(false);
  });
});
