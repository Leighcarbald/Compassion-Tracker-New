import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { 
  generateResetToken, 
  storeResetToken, 
  validateResetToken, 
  removeResetToken, 
  sendPasswordResetEmail,
  sendWelcomeEmail
} from "./email-service";
import session from "express-session";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export async function setupAuth(app: Express) {
  let sessionSettings: session.SessionOptions;

  // Try to use Redis for session storage in production or when REDIS_URL is provided
  if (process.env.REDIS_URL && !process.env.REDIS_URL.includes('<')) {
    try {
      const { RedisStore } = await import('connect-redis');
      const redisModule = await import('redis');
      const redisClient = redisModule.createClient({ url: process.env.REDIS_URL });

      redisClient.on('error', (err: any) => {
        console.error('Redis Client Error:', err);
      });

      redisClient.on('connect', () => {
        console.log('✅ Connected to Redis for session storage');
      });

      await redisClient.connect();

      // Session configuration with Redis store
      sessionSettings = {
        store: new RedisStore({
          client: redisClient,
          ttl: 86400,        // seconds — session expires after 1 day
          disableTouch: true // prevent refreshing TTL on every request
        }),
        secret: process.env.SESSION_SECRET || "your-super-secret-key-change-in-production",
        resave: false,
        saveUninitialized: false,
        cookie: {
          secure: process.env.NODE_ENV === "production",
          httpOnly: true,
          maxAge: 86400000, // 1 day in ms
          sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        },
      };
    } catch (error) {
      console.error('Failed to connect to Redis, falling back to default session store:', error);
      // Fall back to default session configuration
      sessionSettings = {
        secret: process.env.MY_SESSION_SECRET || process.env.SESSION_SECRET || "your-super-secret-key-change-in-production",
        resave: false,
        saveUninitialized: false,
        cookie: {
          secure: false, // Allow non-HTTPS for development
          httpOnly: true,
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
          sameSite: "lax",
        },
      };
    }
  } else {
    console.log('📝 Using default session storage (no Redis URL provided)');
    // Default session configuration for development
    sessionSettings = {
      secret: process.env.MY_SESSION_SECRET || process.env.SESSION_SECRET || "your-super-secret-key-change-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      },
    };
  }

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Password strength validation - Medical grade security
  function validatePasswordStrength(password: string): { valid: boolean; message?: string } {
    if (!password || password.length < 8) {
      return { valid: false, message: "Password must be at least 8 characters long" };
    }
    if (password.length > 128) {
      return { valid: false, message: "Password must be less than 128 characters" };
    }
    
    // Check for uppercase letter
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: "Password must contain at least one uppercase letter" };
    }
    
    // Check for lowercase letter
    if (!/[a-z]/.test(password)) {
      return { valid: false, message: "Password must contain at least one lowercase letter" };
    }
    
    // Check for number
    if (!/[0-9]/.test(password)) {
      return { valid: false, message: "Password must contain at least one number" };
    }
    
    // Check for special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return { valid: false, message: "Password must contain at least one special character (!@#$%^&* etc.)" };
    }
    
    return { valid: true };
  }

  // Passport Local Strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        }
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Middleware to check if user is authenticated
  const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    console.log('Auth check:', {
      isAuthenticated: req.isAuthenticated(),
      hasSession: !!req.session,
      sessionID: req.sessionID,
      user: req.user ? { id: req.user.id, username: req.user.username } : null
    });
    
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ error: "Authentication required" });
  };

  // Registration endpoint
  app.post("/api/register", async (req, res, next) => {
    try {
      const { username, password, name, email } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }

      // Validate password strength
      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.valid) {
        return res.status(400).json({ error: passwordValidation.message });
      }

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      // Check if email already exists (if provided)
      if (email) {
        const existingEmail = await storage.getUserByEmail(email);
        if (existingEmail) {
          return res.status(400).json({ error: "Email address is already registered" });
        }
      }

      // Create new user
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        name: name || null,
        email: email || null,
      });

      // Send welcome email if email is provided
      if (email) {
        try {
          await sendWelcomeEmail(email, name || username);
          console.log(`Welcome email sent to ${email} for new user ${username}`);
        } catch (emailError) {
          console.error(`Failed to send welcome email to ${email}:`, emailError);
          // Continue with registration even if email fails
        }
      }

      // Log in the user automatically
      req.login(user, (err) => {
        if (err) return next(err);
        
        // Return user data without password
        const { password: _, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Login endpoint
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ error: "Internal server error" });
      }
      if (!user) {
        return res.status(401).json({ error: "Invalid username or password" });
      }
      req.logIn(user, (err) => {
        if (err) {
          return res.status(500).json({ error: "Login failed" });
        }
        // Return user data without password
        const { password: _, ...userWithoutPassword } = user;
        res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  // Logout endpoint
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // Get current user endpoint
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    
    // Return user data without password
    const { password: _, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  });

  // Forgot password endpoint
  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { username } = req.body;

      if (!username) {
        return res.status(400).json({ error: "Username is required" });
      }

      const user = await storage.getUserByUsername(username);
      if (!user || !user.email) {
        // Don't reveal if user exists for security
        return res.status(200).json({ message: "If the username exists, a password reset email has been sent" });
      }

      const resetToken = generateResetToken();
      storeResetToken(resetToken, user.id);

      console.log(`Attempting to send password reset email to: ${user.email} for user: ${user.username}`);
      const emailSent = await sendPasswordResetEmail(user.email, user.username, resetToken);
      
      if (emailSent) {
        console.log(`Password reset email sent successfully to ${user.email}`);
        res.status(200).json({ message: "Password reset email sent successfully" });
      } else {
        console.log(`Failed to send password reset email to ${user.email}`);
        res.status(500).json({ error: "Failed to send password reset email" });
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Reset password endpoint
  app.post("/api/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ error: "Token and new password are required" });
      }

      // Validate password strength
      const passwordValidation = validatePasswordStrength(newPassword);
      if (!passwordValidation.valid) {
        return res.status(400).json({ error: passwordValidation.message });
      }

      const userId = validateResetToken(token);
      if (!userId) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      // Hash the new password
      const hashedPassword = await hashPassword(newPassword);
      
      // Update user's password
      await storage.updateUserPassword(userId, hashedPassword);
      
      // Remove the used token
      removeResetToken(token);

      res.status(200).json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Export the middleware for use in other routes
  return { isAuthenticated };
}