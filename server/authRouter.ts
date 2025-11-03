import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { authenticateChild, createChildWithPassword } from "./auth";
import { TRPCError } from "@trpc/server";
import { sdk } from "./_core/sdk";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";

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

      // Create session token using SDK
      const openId = user.openId || `local_${user.id}`;
      const sessionToken = await sdk.createSessionToken(openId, {
        name: user.name || '',
        expiresInMs: ONE_YEAR_MS,
      });

      // Set session cookie
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      return {
        success: true,
        redirectTo: user.role === 'qb_admin' ? '/qb-admin' : '/child-dashboard',
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      };
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

