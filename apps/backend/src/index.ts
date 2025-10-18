import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnections } from './config/database';
import { testSupabaseConnection } from './config/supabase';

// Import routes
import authRouter from './routes/auth';
import profileRouter from './routes/profile';
import sessionsRouter from './routes/sessions';
import connectionsRouter from './routes/connections';
import voiceRouter from './routes/voice';
import integrationsRouter from './routes/integrations';
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
app.use('/api/auth', authRouter);
app.use('/api/profile', profileRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/connections', connectionsRouter);
app.use('/api/voice', voiceRouter);
app.use('/api/integrations', integrationsRouter);
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
    await testSupabaseConnection();
    await testConnections();
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📡 Health check: http://localhost:${PORT}/health`);
      console.log(`\n📚 API Endpoints:`);
      console.log(`   Auth:`);
      console.log(`   POST   /api/auth/signup - Sign up`);
      console.log(`   POST   /api/auth/login - Login`);
      console.log(`   GET    /api/auth/google - Google OAuth`);
      console.log(`\n   Profile:`);
      console.log(`   GET    /api/profile - Get profile`);
      console.log(`   PUT    /api/profile - Update profile`);
      console.log(`   POST   /api/profile/photo - Upload photo`);
      console.log(`\n   Network Sessions:`);
      console.log(`   POST   /api/sessions - Create session`);
      console.log(`   GET    /api/sessions - List sessions`);
      console.log(`   POST   /api/sessions/join - Join session`);
      console.log(`   GET    /api/sessions/:id/attendees - Get attendees`);
      console.log(`\n   Connections:`);
      console.log(`   GET    /api/connections - Get connections`);
      console.log(`   POST   /api/connections - Add connection`);
      console.log(`   GET    /api/connections/:id/notes - Get notes`);
      console.log(`   POST   /api/connections/:id/notes - Add note`);
      console.log(`\n   AI & Voice:`);
      console.log(`   POST   /api/ai/query - AI assistant with Claude`);
      console.log(`   POST   /api/voice/tts - Text to speech`);
      console.log(`   POST   /api/voice/stt - Speech to text`);
      console.log(`\n   Integrations:`);
      console.log(`   POST   /api/integrations/gmail/draft - Draft email`);
      console.log(`   POST   /api/integrations/calendar/suggest-times - Suggest meeting times`);
      console.log(`   POST   /api/integrations/calendar/create-event - Create calendar event`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

