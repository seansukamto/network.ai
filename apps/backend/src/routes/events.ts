import { Router, Request, Response } from 'express';
import { pool, getNeo4jDriver } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import { Event } from '../types';

const router = Router();

/**
 * POST /api/events
 * Create a new event
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, date, location } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Event name is required' });
    }

    const qrCodeToken = uuidv4();
    const eventDate = date ? new Date(date) : new Date();

    // Insert into PostgreSQL
    const result = await pool.query<Event>(
      `INSERT INTO events (name, date, location, qr_code_token)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, eventDate, location || '', qrCodeToken]
    );

    const event = result.rows[0];

    // Create Event node in Neo4j
    const driver = getNeo4jDriver();
    const session = driver.session();
    try {
      await session.run(
        `MERGE (e:Event {id: $id})
         SET e.name = $name, 
             e.date = datetime($date), 
             e.location = $location`,
        {
          id: event.id,
          name: event.name,
          date: eventDate.toISOString(),
          location: event.location || '',
        }
      );
    } finally {
      await session.close();
    }

    res.json(event);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

/**
 * GET /api/events
 * List all events
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await pool.query<Event>(
      'SELECT * FROM events ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

/**
 * GET /api/events/:id
 * Get event by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query<Event>(
      'SELECT * FROM events WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

/**
 * GET /api/events/:id/qr
 * Generate QR code for event
 */
router.get('/:id/qr', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query<Event>(
      'SELECT * FROM events WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = result.rows[0];
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const joinUrl = `${frontendUrl}/join?token=${event.qr_code_token}`;

    // Generate QR code as PNG data URL
    const qrDataUrl = await QRCode.toDataURL(joinUrl, {
      width: 400,
      margin: 2,
    });

    res.json({
      qrCode: qrDataUrl,
      url: joinUrl,
      event: event,
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

/**
 * GET /api/events/:id/attendees
 * Get all attendees for an event
 */
router.get('/:id/attendees', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT u.*, a.joined_at
       FROM users u
       JOIN attendance a ON u.id = a.user_id
       WHERE a.event_id = $1
       ORDER BY a.joined_at DESC`,
      [id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching attendees:', error);
    res.status(500).json({ error: 'Failed to fetch attendees' });
  }
});

export default router;

