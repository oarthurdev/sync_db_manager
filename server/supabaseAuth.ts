import { createClient } from '@supabase/supabase-js';
import type { Express, RequestHandler } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY must be set");
}

// Supabase client for server operations
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Supabase client for public operations
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-key',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  // Login endpoint
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email e senha são obrigatórios" });
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      if (!data.user) {
        return res.status(400).json({ error: "Falha na autenticação" });
      }

      // Upsert user in our database
      await storage.upsertUser({
        id: data.user.id,
        email: data.user.email,
        firstName: data.user.user_metadata?.first_name,
        lastName: data.user.user_metadata?.last_name,
        profileImageUrl: data.user.user_metadata?.avatar_url,
      });

      // Store session
      (req.session as any).user = {
        id: data.user.id,
        email: data.user.email,
        accessToken: data.session?.access_token,
        refreshToken: data.session?.refresh_token,
      };

      res.json({
        user: data.user,
        session: data.session,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Register endpoint
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email e senha são obrigatórios" });
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
        },
      });

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      if (!data.user) {
        return res.status(400).json({ error: "Falha no registro" });
      }

      // Upsert user in our database
      await storage.upsertUser({
        id: data.user.id,
        email: data.user.email,
        firstName,
        lastName,
        profileImageUrl: data.user.user_metadata?.avatar_url,
      });

      res.json({
        user: data.user,
        session: data.session,
        message: "Usuário criado com sucesso",
      });
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", async (req, res) => {
    try {
      const session = (req.session as any);
      if (session.user?.accessToken) {
        await supabase.auth.signOut();
      }

      req.session.destroy(() => {
        res.json({ message: "Logout realizado com sucesso" });
      });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  try {
    const session = (req.session as any);
    
    if (!session.user?.accessToken) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(session.user.accessToken);
    
    if (error || !user) {
      // Try to refresh token if we have a refresh token
      if (session.user.refreshToken) {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({
          refresh_token: session.user.refreshToken,
        });

        if (refreshError || !refreshData.session) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        // Update session with new tokens
        session.user.accessToken = refreshData.session.access_token;
        session.user.refreshToken = refreshData.session.refresh_token;

        (req as any).user = refreshData.user;
        return next();
      }

      return res.status(401).json({ message: "Unauthorized" });
    }

    (req as any).user = user;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(401).json({ message: "Unauthorized" });
  }
};