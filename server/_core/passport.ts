
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import * as db from '../db';
import { ENV } from './env';

passport.use(new GoogleStrategy({
    clientID: ENV.googleClientId,
    clientSecret: ENV.googleClientSecret,
    callbackURL: `${ENV.appUrl}/auth/google/callback`,
    scope: ['profile', 'email']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value;
      if (!email) {
        return done(new Error("No email found from Google"), undefined);
      }

      let user = await db.getUserByEmail(email);

      if (!user) {
        const newUser = await db.upsertUser({
          openId: `google_${profile.id}`,
          name: profile.displayName,
          email: email,
          loginMethod: 'google',
          role: 'parent', // Default role for new Google signups
          lastSignedIn: new Date(),
        });
        user = await db.getUserByEmail(email);
      } else {
        await db.upsertUser({
            openId: user.openId,
            lastSignedIn: new Date(),
        });
      }

      return done(null, user);
    } catch (error) {
      return done(error, undefined);
    }
  }
));

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await db.getUserById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;

