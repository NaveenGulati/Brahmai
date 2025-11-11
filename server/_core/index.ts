import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import net from "net";
import session from "express-session";
import passport from "passport";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { initializeGoogleAuth } from "./googleAuth";
import googleAuthRoutes from "./googleAuthRoutes";
import { ENV } from "./env";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  
  // Trust proxy - required for Render.com and other reverse proxies
  app.set('trust proxy', 1);
  
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use(cookieParser());
  
  // Session middleware for Passport
  app.use(
    session({
      secret: ENV.cookieSecret || 'fallback-secret-key',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: ENV.isProduction,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: ENV.isProduction ? 'none' : 'lax', // 'none' required for OAuth redirects in production
      },
    })
  );
  
  // Initialize Passport
  initializeGoogleAuth();
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Google OAuth routes
  app.use('/api', googleAuthRoutes);
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  
  // Simple REST API for saving notes
  app.post('/api/notes', async (req, res) => {
    try {
      const { highlightedText, questionId, subject } = req.body;
      const session = (req as any).session;
      
      if (!session?.user?.id) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      if (!highlightedText || highlightedText.trim().length < 10) {
        return res.status(400).json({ error: 'Note text must be at least 10 characters' });
      }
      
      // Import db dynamically to avoid circular dependencies
      const { db } = await import('../db');
      const { notes } = await import('../db-schema-notes');
      
      const newNote = await db.insert(notes).values({
        userId: session.user.id,
        highlightedText,
        questionId,
        subject,
        createdAt: new Date(),
      }).returning();
      
      console.log('\u2705 Note saved successfully:', newNote[0]);
      res.json({ success: true, note: newNote[0] });
    } catch (error) {
      console.error('\u274c Error saving note:', error);
      res.status(500).json({ error: 'Failed to save note' });
    }
  });
  
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
