// The shape of our data. Frontend and backend both import these,
// so if a field changes, the editor shows everything that breaks.

import type {
    EVENT_TYPES,
    REVEAL_STYLES,
    SURPRISE_STATUSES,
  } from "./constants";
  
  export type EventType = (typeof EVENT_TYPES)[number];
  export type RevealStyle = (typeof REVEAL_STYLES)[number];
  export type SurpriseStatus = (typeof SURPRISE_STATUSES)[number];
  
  export interface Surprise {
    id: string;
    ownerId: string; // Cognito user id
    title: string;
    eventType: EventType;
    revealStyle: RevealStyle;
    recipientName: string;
    recipientEmail?: string;
    recipientPhone?: string;
    deliverAt: string; // ISO date string, e.g. 2026-12-01T09:00:00Z
    status: SurpriseStatus;
    createdAt: string;
    updatedAt: string;
  }
  
  export interface Message {
    id: string;
    surpriseId: string;
    authorName: string;
    text: string;
    hidden: boolean; // hidden messages unlock during the reveal
    unlockAt?: string; // optional: unlock at a specific time
    createdAt: string;
  }
  
  export interface MediaItem {
    id: string;
    surpriseId: string;
    s3Key: string; // never sent to the browser as a public URL
    contentType: string;
    sizeBytes: number;
    createdAt: string;
  }
  
  export interface Invite {
    surpriseId: string;
    tokenHash: string; // we store only the hash of the link token
    invitedEmail?: string;
    createdAt: string;
    expiresAt: string;
  }
  
  // Gift cards the creator ALREADY owns. We do not process payments.
  export interface GiftCard {
    id: string;
    surpriseId: string;
    storeName: string;
    codeEncrypted: string; // encrypted with KMS, never stored in plain text
    pinEncrypted?: string;
    codeLast4: string; // safe to show on the dashboard
    createdAt: string;
  }
  
  // What the creator dashboard sees (no secrets)
  export type GiftCardSummary = Pick<GiftCard, "id" | "storeName" | "codeLast4">;
  
  // What the public /open endpoint returns BEFORE delivery time
  export interface CountdownOnlyResponse {
    state: "countdown";
    deliverAt: string;
    recipientName: string;
  }
  
  // What the public /open endpoint returns AFTER delivery time
  export interface OpenedSurpriseResponse {
    state: "open";
    title: string;
    eventType: EventType;
    revealStyle: RevealStyle;
    recipientName: string;
    messages: Pick<Message, "id" | "authorName" | "text" | "hidden" | "unlockAt">[];
    photoUrls: string[]; // temporary links
    giftCards: { storeName: string; code: string; pin?: string }[];
  }
  
  export type OpenSurpriseResponse = CountdownOnlyResponse | OpenedSurpriseResponse;