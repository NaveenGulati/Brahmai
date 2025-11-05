import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { COOKIE_NAME } from "@shared/const";
import * as db from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    // Get session cookie
    const sessionCookie = opts.req.cookies?.[COOKIE_NAME];
    
    if (sessionCookie) {
      // Parse session data
      const sessionData = JSON.parse(sessionCookie);
      
      // Get user from database
      if (sessionData.userId) {
        user = await db.getUserById(sessionData.userId);
      }
    }
  } catch (error) {
    // Authentication is optional for public procedures.
    console.error('[Context] Auth error:', error);
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
