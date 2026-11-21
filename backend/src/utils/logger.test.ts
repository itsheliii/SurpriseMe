// Tests for the logger's safety net: private values must never reach the logs,
// even if someone logs them by mistake.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The logger reads LOG_LEVEL when it is created. Force INFO so a different
// setting on someone's computer can't make these tests fail or pass by accident.
vi.stubEnv("LOG_LEVEL", "INFO");
const { logger } = await import("./logger");

// Everything the logger prints during one test.
let printed = "";

beforeEach(() => {
  printed = "";
  // Info goes to stdout, warnings and errors to stderr: capture both.
  for (const stream of [process.stdout, process.stderr]) {
    vi.spyOn(stream, "write").mockImplementation((chunk: unknown) => {
      printed += String(chunk);
      return true;
    });
  }
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("logger", () => {
  it("hides codes, PINs, tokens, emails, phones and message text", () => {
    logger.info("test", {
      surpriseId: "s-1",
      giftCardCode: "SECRET-CODE-1",
      pin: "PIN-9876",
      shareToken: "SECRET-TOKEN-1",
      recipientEmail: "sam@example.com",
      recipientPhone: "+16175551234",
      text: "a private message",
      Authorization: "Bearer SECRET-JWT",
    });
    for (const secret of ["SECRET-CODE-1", "PIN-9876", "SECRET-TOKEN-1", "sam@example.com", "+16175551234", "a private message", "SECRET-JWT"]) {
      expect(printed).not.toContain(secret);
    }
    expect(printed).toContain("[REDACTED]");
  });

  it("hides private values in warnings and errors too", () => {
    logger.error("test", { surpriseId: "s-7", giftCardCode: "SECRET-CODE-3" });
    expect(printed).toContain("s-7");
    expect(printed).not.toContain("SECRET-CODE-3");
  });

  it("still logs ids and counts", () => {
    logger.info("test", { surpriseId: "s-42", count: 3 });
    expect(printed).toContain("s-42");
  });

  it("hides private values inside nested objects and lists", () => {
    logger.warn("test", { giftCards: [{ storeName: "Bookshop", code: "SECRET-CODE-2" }] });
    expect(printed).not.toContain("SECRET-CODE-2");
    expect(printed).toContain("Bookshop");
  });
});
