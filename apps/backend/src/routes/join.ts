import { Router, Request, Response } from 'express';
import { pool, getNeo4jDriver } from '../config/database';
import { generateEmbedding } from '../config/openai';
import { User } from '../types';

const router = Router();

/**
 * POST /api/join
 * Join an event via QR code token
 * Body: { token, name, email, company, jobTitle, bio }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { token, name, email, company, jobTitle, bio } = req.body;

    if (!token || !name) {
      return res.status(400).json({ 
        error: 'Token and name are required' 
      });
    }

    // Find event by token
    const eventResult = await pool.query(
      'SELECT * FROM events WHERE qr_code_token = $1',
      [token]
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid token or event not found' });
    }

    const event = eventResult.rows[0];

    // Check if user already exists by email
    let userId: string;
    let user: User;

    if (email) {
      const existingUser = await pool.query<User>(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );

      if (existingUser.rows.length > 0) {
        // Update existing user
        const updateResult = await pool.query<User>(
          `UPDATE users 
           SET name = $1, company = $2, job_title = $3, bio = $4
           WHERE email = $5
           RETURNING *`,
          [name, company || '', jobTitle || '', bio || '', email]
        );
        user = updateResult.rows[0];
        userId = user.id;
      } else {
        // Create new user
        const insertResult = await pool.query<User>(
          `INSERT INTO users (name, email, company, job_title, bio)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [name, email, company || '', jobTitle || '', bio || '']
        );
        user = insertResult.rows[0];
        userId = user.id;
      }
    } else {
      // No email, create new user
      const insertResult = await pool.query<User>(
        `INSERT INTO users (name, email, company, job_title, bio)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [name, email || '', company || '', jobTitle || '', bio || '']
      );
      user = insertResult.rows[0];
      userId = user.id;
    }

    // Add attendance record
    try {
      await pool.query(
        `INSERT INTO attendance (user_id, event_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, event_id) DO NOTHING`,
        [userId, event.id]
      );
    } catch (error) {
      // User already registered for this event
      console.log('User already registered for event');
    }

    // Create or update Person node and relationship in Neo4j
    const driver = getNeo4jDriver();
    const session = driver.session();
    try {
      await session.run(
        `MERGE (p:Person {id: $userId})
         SET p.name = $name,
             p.email = $email,
             p.company = $company,
             p.jobTitle = $jobTitle,
             p.bio = $bio
         WITH p
         MATCH (e:Event {id: $eventId})
         MERGE (p)-[r:ATTENDED]->(e)
         SET r.joinedAt = datetime()`,
        {
          userId,
          name,
          email: email || '',
          company: company || '',
          jobTitle: jobTitle || '',
          bio: bio || '',
          eventId: event.id,
        }
      );
    } finally {
      await session.close();
    }

    // Generate and store embedding for semantic search
    // Create from all available profile data (not just bio)
    try {
      const parts = [
        name,
        jobTitle && company ? `${jobTitle} at ${company}` : jobTitle || company,
        bio,
      ].filter(Boolean);

      const embeddingText = parts.join('. ');

      // Generate if we have any meaningful content
      if (embeddingText.trim()) {
        const embedding = await generateEmbedding(embeddingText);
        
        await pool.query(
          `INSERT INTO vectors (owner_type, owner_id, embedding, text_content)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT DO NOTHING`,
          ['person', userId, JSON.stringify(embedding), embeddingText]
        );

        console.log(`✅ Generated vector for ${name} (${userId})`);
      }
    } catch (error) {
      console.error('Error generating embedding:', error);
      // Continue even if embedding fails
    }

    res.json({
      success: true,
      user,
      event: {
        id: event.id,
        name: event.name,
        date: event.date,
        location: event.location,
      },
    });
  } catch (error) {
    console.error('Error joining event:', error);
    res.status(500).json({ error: 'Failed to join event' });
  }
});

/**
 * GET /api/join/verify/:token
 * Verify a QR code token and return event details
 */
router.get('/verify/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    
    const result = await pool.query(
      'SELECT id, name, date, location FROM events WHERE qr_code_token = $1',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid token' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(500).json({ error: 'Failed to verify token' });
  }
});

export default router;

