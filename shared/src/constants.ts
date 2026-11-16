// Limits and fixed lists used by both frontend and backend.

export const EVENT_TYPES = [
    "birthday",
    "anniversary",
    "wedding",
    "graduation",
    "thank-you",
    "just-because",
  ] as const;
  
  export const REVEAL_STYLES = ["confetti", "gift-unwrap", "scratch-off", "simple-fade"] as const;
  
  export const SURPRISE_STATUSES = ["draft", "scheduled", "delivered", "cancelled"] as const;
  
  export const LIMITS = {
    titleMaxLength: 100,
    messageMaxLength: 1000,
    maxMessagesPerSurprise: 50,
    maxPhotosPerSurprise: 20,
    maxPhotoSizeBytes: 5 * 1024 * 1024, // 5 MB
    maxGiftCardsPerSurprise: 5,
  } as const;
  
  export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
  
  // How long temporary photo links last, in seconds
  export const PRESIGNED_URL_SECONDS = 15 * 60;