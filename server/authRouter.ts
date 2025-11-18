import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { authenticateChild, createChildWithPassword } from "./auth";
import { TRPCError } from "@trpc/server";
import { sdk } from "./_core/sdk";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { getDb } from "./db";
import { childProfiles } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export const authRouter = router({
  // Child login with username/password
  childLogin: publicProcedure
    .input(z.object({
      username: z.string().min(1),
      password: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const user = await authenticateChild(input.username, input.password);
      
      if (!user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid username or password',
        });
      }

      // For child users, get their childProfileId
      let childProfileId = null;
      if (user.role === 'child') {
        console.log('[Auth] User is child, getting childProfileId for userId:', user.id);
        const db = await getDb();
        if (!db) {
          console.error('[Auth] Database not available!');
        } else {
          console.log('[Auth] Database OK, querying childProfiles...');
          const profile = await db.select({ id: childProfiles.id })
            .from(childProfiles)
            .where(eq(childProfiles.userId, user.id))
            .limit(1);
          console.log('[Auth] Query result:', profile);
          if (profile.length > 0) {
            childProfileId = profile[0].id;
            console.log('[Auth] Found childProfileId:', childProfileId);
          } else {
            console.error('[Auth] No childProfile found for userId:', user.id);
          }
        }
      }
      console.log('[Auth] Final childProfileId:', childProfileId);

      // Create simple session token (JWT will be added later)
      const sessionData = JSON.stringify({
        userId: user.id,
        username: user.username,
        role: user.role,
        timestamp: Date.now(),
      });

      // Set session cookie
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionData, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      console.log('[Auth] Returning success response...');
      // Determine redirect based on role
      let redirectTo = '/';
      if (user.role === 'child') redirectTo = '/child';
      else if (user.role === 'parent') redirectTo = '/parent';
      else if (user.role === 'teacher') redirectTo = '/teacher';
      else if (user.role === 'qb_admin') redirectTo = '/qb-admin';
      
      const response = {
        success: true,
        redirectTo,
        user: {
          id: childProfileId || user.id, // Return childProfileId for children, userId for others
          userId: user.id, // Keep userId for reference
          name: user.name,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      };
      console.log('[Auth] Response:', response);
      return response;
    }),

  // Create child account (called by parent)
  createChildAccount: publicProcedure
    .input(z.object({
      parentId: z.number(),
      name: z.string().min(1),
      username: z.string().min(3).max(50),
      password: z.string().min(4),
      email: z.string().email().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        await createChildWithPassword(
          input.parentId,
          input.name,
          input.username,
          input.password,
          input.email
        );

        return {
          success: true,
          message: 'Child account created successfully',
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message || 'Failed to create account',
        });
      }
    }),
});

