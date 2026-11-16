// Simple error types so every endpoint answers with the right HTTP status.
export class AppError extends Error {
    constructor(public statusCode: number, message: string) {
      super(message);
    }
  }
  
  export const badRequest = (msg = "Bad request") => new AppError(400, msg);
  export const unauthorized = (msg = "Not signed in") => new AppError(401, msg);
  export const forbidden = (msg = "Not allowed") => new AppError(403, msg);
  export const notFound = (msg = "Not found") => new AppError(404, msg);
  
  export function json(statusCode: number, body: unknown) {
    return {
      statusCode,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    };
  }
  
  // Turns any error into an API response. Never leaks internal details.
  export function toResponse(err: unknown) {
    if (err instanceof AppError) return json(err.statusCode, { error: err.message });
    return json(500, { error: "Something went wrong" });
  }