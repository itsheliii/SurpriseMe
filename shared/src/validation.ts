 // Input rules. The BACKEND must run these on every request,
// the frontend can reuse them to show errors early.

import { z } from "zod";
import {
  ALLOWED_IMAGE_TYPES,
  EVENT_TYPES,
  LIMITS,
  REVEAL_STYLES,
} from "./constants";

export const createSurpriseSchema = z.object({
  title: z.string().trim().min(1).max(LIMITS.titleMaxLength),
  eventType: z.enum(EVENT_TYPES),
  revealStyle: z.enum(REVEAL_STYLES),
  recipientName: z.string().trim().min(1).max(100),
  recipientEmail: z.string().email().optional(),
  recipientPhone: z
    .string()
    .regex(/^\+[1-9]\d{7,14}$/, "Use international format, e.g. +16175551234")
    .optional(),
  deliverAt: z.string().datetime(),
});

// Editing: same rules as creating, but every field is optional.
export const updateSurpriseSchema = createSurpriseSchema.partial();

export const addMessageSchema = z.object({
  authorName: z.string().trim().min(1).max(60),
  text: z.string().trim().min(1).max(LIMITS.messageMaxLength),
  hidden: z.boolean().default(false),
  unlockAt: z.string().datetime().optional(),
});

export const uploadUrlRequestSchema = z.object({
  contentType: z.enum(ALLOWED_IMAGE_TYPES),
  sizeBytes: z.number().int().positive().max(LIMITS.maxPhotoSizeBytes),
});

export const addGiftCardSchema = z.object({
  storeName: z.string().trim().min(1).max(60),
  code: z.string().trim().min(3).max(64),
  pin: z.string().trim().max(32).optional(),
});

export type CreateSurpriseInput = z.infer<typeof createSurpriseSchema>;
export type AddMessageInput = z.infer<typeof addMessageSchema>;
export type UploadUrlRequest = z.infer<typeof uploadUrlRequestSchema>;
export type AddGiftCardInput = z.infer<typeof addGiftCardSchema>;
export type UpdateSurpriseInput = z.infer<typeof updateSurpriseSchema>;