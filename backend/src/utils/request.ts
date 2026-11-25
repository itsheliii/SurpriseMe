// Small helpers for reading anything that comes from outside (the body, the URL )
// nothing from outside is trusted until it paes through or through zod
import {z} from "zod";
import { badRequest, notFound}  from "./errors";

export function parseJsonBody(raw:string | undefined) : unknown {
    try {
        return JSON.parse(raw ?? "");
    } catch{
        throw badRequest("Invalid JSON body");
    }
}

// Out link tokens are 32 random bytes in base64url = exactly 43 characters
const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

// A badly shaped token gets the same 404 as a wrong one, so nobody learns anything
export function parseToken(raw: unknown): string {
    const parse = tokenSchema.safeParse(raw);
    if (!parse.success) {
        throw notFound("This Surprise was not found");
    }
    return parse.data;
}

