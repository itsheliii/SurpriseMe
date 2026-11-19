// anything from the outside (boDY, URL) is untrusted, including ids in the URL
import { z } from "zod";
import { badRequest } from "./errors";

const surpriseIdSchema = z.string().uuid();

export function parseSurpriseId(raw: unknown): string {
  const parsed = surpriseIdSchema.safeParse(raw);
  if (!parsed.success) throw badRequest("Invalid surprise id");
  return parsed.data;
}

