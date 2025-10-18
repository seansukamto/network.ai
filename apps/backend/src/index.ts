import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnections } from './config/database';

// Import routes
import eventsRouter from './routes/events';
import joinRouter from './routes/join';
import metRouter from './routes/met';
import aiRouter from './routes/ai';
import usersRouter from './routes/users';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/events', eventsRouter);
app.use('/api/join', joinRouter);
app.use('/api/met', metRouter);
app.use('/api/ai', aiRouter);
app.use('/api/users', usersRouter);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function start() {
  try {
    // Test database connections
    await testConnections();
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📡 Health check: http://localhost:${PORT}/health`);
      console.log(`\n📚 API Endpoints:`);
      console.log(`   POST   /api/events - Create event`);
      console.log(`   GET    /api/events - List events`);
      console.log(`   GET    /api/events/:id/qr - Get QR code`);
      console.log(`   POST   /api/join - Join event`);
      console.log(`   POST   /api/met - Record meeting`);
      console.log(`   POST   /api/ai/query - AI assistant`);
      console.log(`   GET    /api/users - List users`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

