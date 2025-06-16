import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import crypto from 'crypto';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

// Generate a random session secret if one isn't provided in environment
if (!process.env.SESSION_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET environment variable is required in production');
  }
  process.env.SESSION_SECRET = crypto.randomBytes(32).toString('hex');
  log('Generated random SESSION_SECRET for development use', 'security');
  log('For production, set a persistent SESSION_SECRET in your environment variables', 'security');
}

const app = express();

// Apply security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Needed for development
      connectSrc: ["'self'", "ws:", "wss:"], // Allow WebSocket connections for development
      imgSrc: ["'self'", "data:", "blob:"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'", "data:"],
    },
  },
  // Disable for development as it can interfere with hot module reload
  crossOriginEmbedderPolicy: process.env.NODE_ENV === 'production',
}));

app.use(express.json({ limit: '1mb' })); // Limit JSON payload size
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser(process.env.SESSION_SECRET)); // Use the same secret for cookies as sessions

// Configure rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: { message: 'Too many requests, please try again after 15 minutes' },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip rate limiting for PIN verification checks
  skip: (req) => req.path.includes('/check-verified')
});

// Apply to all API routes
app.use('/api', apiLimiter);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize database tables on startup
  try {
    log('Initializing database connection and tables...', 'setup');
    const { pool } = await import('../db/index.js');
    
    // Check if tables exist
    const checkResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'users'
      );
    `);
    
    const tablesExist = checkResult.rows[0].exists;
    
    if (!tablesExist) {
      log('Database tables missing - creating schema...', 'setup');
      
      // Read and execute the SQL schema file
      const fs = await import('fs');
      const path = await import('path');
      
      const sqlPath = path.join(process.cwd(), 'scripts', 'tables.sql');
      if (fs.existsSync(sqlPath)) {
        const sqlScript = fs.readFileSync(sqlPath, 'utf8');
        await pool.query(sqlScript);
        log('Database tables created successfully', 'setup');
      } else {
        log('SQL schema file not found at scripts/tables.sql', 'error');
      }
    } else {
      log('Database tables already exist', 'setup');
    }
  } catch (error: any) {
    log(`Database initialization error: ${error.message}`, 'error');
    // Continue startup process even if initialization fails
  }

  const server = await registerRoutes(app);

  // Global error handler
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    // Log the full error only in development
    if (app.get('env') === 'development') {
      console.error(`Error (${req.method} ${req.path}):`, err);
    } else {
      // In production, just log the error message without the stack trace
      console.error(`Error (${req.method} ${req.path}): ${message}`);
    }

    // Don't expose error details in production
    const response = {
      message,
      ...(app.get('env') === 'development' && { 
        stack: err.stack,
        details: err.details || err.errors || undefined
      })
    };

    res.status(status).json(response);
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Use the PORT environment variable if available, otherwise use 5000
  // This makes the app compatible with hosting platforms like Render
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 5000;
  
  // Ensure we log the environment to help with debugging
  log(`Starting server in ${app.get('env')} mode`);
  
  // Log important environment variables (without values)
  log(`Environment variables available: ${Object.keys(process.env)
    .filter(key => !key.includes('KEY') && !key.includes('SECRET') && !key.includes('PASSWORD') && !key.includes('TOKEN'))
    .join(', ')}`);
  
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Express app is listening on port ${PORT}`);
});
