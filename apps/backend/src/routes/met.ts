import { Router, Request, Response } from 'express';
import { getNeo4jDriver } from '../config/database';
import { generateEmbedding } from '../config/openai';
import { pool } from '../config/database';

const router = Router();

/**
 * POST /api/met
 * Record that two users met at an event
 * Body: { userAId, userBId, note, eventId }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userAId, userBId, note, eventId } = req.body;

    if (!userAId || !userBId) {
      return res.status(400).json({ 
        error: 'Both userAId and userBId are required' 
      });
    }

    if (userAId === userBId) {
      return res.status(400).json({ 
        error: 'Cannot create meeting with yourself' 
      });
    }

    // Create bidirectional MET_AT relationship in Neo4j
    const driver = getNeo4jDriver();
    const session = driver.session();
    try {
      const result = await session.run(
        `MATCH (a:Person {id: $userAId}), (b:Person {id: $userBId})
         MERGE (a)-[r1:MET_AT]->(b)
         MERGE (b)-[r2:MET_AT]->(a)
         SET r1.note = $note,
             r1.at = datetime(),
             r1.eventId = $eventId,
             r2.note = $note,
             r2.at = datetime(),
             r2.eventId = $eventId
         RETURN a.name as nameA, b.name as nameB`,
        {
          userAId,
          userBId,
          note: note || '',
          eventId: eventId || null,
        }
      );

      if (result.records.length === 0) {
        return res.status(404).json({ 
          error: 'One or both users not found' 
        });
      }

      // If there's a note, generate embedding and store it
      if (note && note.trim()) {
        try {
          const userAResult = await pool.query(
            'SELECT name, company, job_title FROM users WHERE id = $1',
            [userAId]
          );
          const userBResult = await pool.query(
            'SELECT name, company, job_title FROM users WHERE id = $1',
            [userBId]
          );

          if (userAResult.rows.length > 0 && userBResult.rows.length > 0) {
            const userA = userAResult.rows[0];
            const userB = userBResult.rows[0];
            
            const embeddingText = `Meeting between ${userA.name} (${userA.job_title} at ${userA.company}) and ${userB.name} (${userB.job_title} at ${userB.company}): ${note}`;
            const embedding = await generateEmbedding(embeddingText);

            // Store for both users
            await pool.query(
              `INSERT INTO vectors (owner_type, owner_id, embedding, text_content)
               VALUES ($1, $2, $3, $4)`,
              ['note', userAId, JSON.stringify(embedding), embeddingText]
            );

            await pool.query(
              `INSERT INTO vectors (owner_type, owner_id, embedding, text_content)
               VALUES ($1, $2, $3, $4)`,
              ['note', userBId, JSON.stringify(embedding), embeddingText]
            );
          }
        } catch (error) {
          console.error('Error generating meeting embedding:', error);
          // Continue even if embedding fails
        }
      }

      const record = result.records[0];
      res.json({
        success: true,
        meeting: {
          userA: { id: userAId, name: record.get('nameA') },
          userB: { id: userBId, name: record.get('nameB') },
          note,
          timestamp: new Date().toISOString(),
        },
      });
    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('Error recording meeting:', error);
    res.status(500).json({ error: 'Failed to record meeting' });
  }
});

/**
 * GET /api/met/:userId
 * Get all people a user has met
 */
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const driver = getNeo4jDriver();
    const session = driver.session();
    try {
      const result = await session.run(
        `MATCH (me:Person {id: $userId})-[r:MET_AT]->(other:Person)
         RETURN other.id as id, 
                other.name as name,
                other.company as company,
                other.jobTitle as jobTitle,
                other.email as email,
                r.note as note,
                r.at as metAt,
                r.eventId as eventId
         ORDER BY r.at DESC`,
        { userId }
      );

      const meetings = result.records.map(record => ({
        id: record.get('id'),
        name: record.get('name'),
        company: record.get('company'),
        jobTitle: record.get('jobTitle'),
        email: record.get('email'),
        note: record.get('note'),
        metAt: record.get('metAt'),
        eventId: record.get('eventId'),
      }));

      res.json(meetings);
    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('Error fetching meetings:', error);
    res.status(500).json({ error: 'Failed to fetch meetings' });
  }
});

export default router;

