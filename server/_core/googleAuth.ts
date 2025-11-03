import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { ENV } from './env';
import { upsertUser } from '../db';

export function initializeGoogleAuth() {
  passport.use(
    new GoogleStrategy(
      {
        clientID: ENV.googleClientId,
        clientSecret: ENV.googleClientSecret,
        callbackURL: ENV.googleCallbackUrl,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Extract user info from Google profile
          const email = profile.emails?.[0]?.value || '';
          const name = profile.displayName || '';
          const googleId = profile.id;

          // Upsert user in database
          await upsertUser({
            openId: `google_${googleId}`,
            email,
            name,
            loginMethod: 'google',
            role: 'parent', // Google OAuth users are parents/teachers
            lastSignedIn: new Date(),
          });

          // Return user profile
          done(null, {
            openId: `google_${googleId}`,
            email,
            name,
            loginMethod: 'google',
          });
        } catch (error) {
          done(error as Error);
        }
      }
    )
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.openId);
  });

  passport.deserializeUser(async (openId: string, done) => {
    try {
      const { getUser } = await import('../db');
      const user = await getUser(openId);
      done(null, user || null);
    } catch (error) {
      done(error);
    }
  });
}

