// The server decides if a surprise can be opened. Never trust the frontend.
export function isDelivered(deliverAtIso: string, now: Date = new Date()): boolean {
  return now.getTime() >= new Date(deliverAtIso).getTime();
}