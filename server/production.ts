import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { registerRoutes } from './routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

// Serve static files from client build
app.use(express.static(path.join(__dirname, '../client')));

// Register API routes
const server = await registerRoutes(app);

// Catch-all handler: send back React's index.html file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Compassion Tracker running on port ${PORT}`);
});