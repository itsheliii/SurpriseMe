import type { CreateSurpriseInput } from "@surpriseme/shared";

// Browser-only prototype storage. AWS integration will save metadata and ownership
// in DynamoDB and upload photos to S3 via authenticated, presigned upload URLs.
export interface LocalDraft extends CreateSurpriseInput {
  id: string;
  status: "draft";
  message: string;
  photos: File[];
  updatedAt: string;
}

async function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("surpriseme-local-drafts", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("drafts", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Close other SurpriseMe tabs and try again."));
  });
}

async function transaction<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction("drafts", mode);
      const request = action(tx.objectStore("drafts"));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error("Draft storage was interrupted."));
    });
  } finally {
    db.close();
  }
}

export async function listLocalDrafts(): Promise<LocalDraft[]> {
  const drafts = await transaction<LocalDraft[]>("readonly", (store) => store.getAll());
  return drafts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getLocalDraft(id: string): Promise<LocalDraft | undefined> {
  return transaction("readonly", (store) => store.get(id));
}

export async function saveLocalDraft(draft: LocalDraft): Promise<void> {
  await transaction("readwrite", (store) => store.put(draft));
}
