import { Router, Request, Response } from 'express';
import { supabaseAdmin, getUserByAuthId } from '../config/supabase';
import { getNeo4jDriver } from '../config/database';
import { generateEmbedding } from '../config/openai';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from './profile';

const router = Router();

/**
 * POST /api/sessions
 * Create a new network session
 */
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { name, description, date, location, max_attendees } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Session name is required' });
    }

    // Get user profile
    const profile = await getUserByAuthId(user.id);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const qrCodeToken = uuidv4();
    const sessionDate = date ? new Date(date) : new Date();

    // Insert into Supabase
    const { data, error } = await supabaseAdmin
      .from('network_sessions')
      .insert({
        name,
        description,
        date: sessionDate.toISOString(),
        location: location || '',
        qr_code_token: qrCodeToken,
        host_user_id: profile.id,
        max_attendees: max_attendees || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Create Event node in Neo4j
    const driver = getNeo4jDriver();
    const session = driver.session();
    try {
      await session.run(
        `MERGE (e:Event {id: $id})
         SET e.name = $name,
             e.date = datetime($date),
             e.location = $location,
             e.description = $description`,
        {
          id: data.id,
          name: data.name,
          date: sessionDate.toISOString(),
          location: location || '',
          description: description || '',
        }
      );
    } finally {
      await session.close();
    }

    res.json(data);
  } catch (error: any) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

/**
 * GET /api/sessions
 * List all active network sessions
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('network_sessions')
      .select(`
        *,
        host:host_user_id (
          id,
          name,
          photo_url
        )
      `)
      .eq('is_active', true)
      .order('date', { ascending: false });

    if (error) {
      throw error;
    }

    res.json(data || []);
  } catch (error: any) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

/**
 * GET /api/sessions/:id
 * Get session by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('network_sessions')
      .select(`
        *,
        host:host_user_id (
          id,
          name,
          photo_url,
          company,
          job_title
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(data);
  } catch (error: any) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

/**
 * GET /api/sessions/:id/qr
 * Generate QR code for session
 */
router.get('/:id/qr', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('network_sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const joinUrl = `${frontendUrl}/join?token=${data.qr_code_token}`;

    // Generate QR code as PNG data URL
    const qrDataUrl = await QRCode.toDataURL(joinUrl, {
      width: 400,
      margin: 2,
    });

    res.json({
      qrCode: qrDataUrl,
      url: joinUrl,
      session: data,
    });
  } catch (error: any) {
    console.error('Error generating QR code:', error);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

/**
 * GET /api/sessions/:id/attendees
 * Get all attendees for a session (with real-time updates via Supabase Realtime)
 */
router.get('/:id/attendees', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('attendance')
      .select(`
        *,
        user:user_id (
          id,
          name,
          email,
          photo_url,
          company,
          job_title,
          bio,
          interests,
          linkedin_url,
          twitter_url
        )
      `)
      .eq('session_id', id)
      .order('joined_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json(data || []);
  } catch (error: any) {
    console.error('Error fetching attendees:', error);
    res.status(500).json({ error: 'Failed to fetch attendees' });
  }
});

/**
 * POST /api/sessions/join-anonymous
 * Join a session via QR code token (public, no auth required)
 * For users scanning QR codes who may not have accounts
 */
router.post('/join-anonymous', async (req: Request, res: Response) => {
  try {
    const { token, name, email, company, jobTitle, bio } = req.body;

    if (!token || !name) {
      return res.status(400).json({ error: 'Token and name are required' });
    }

    // Find session by token
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('network_sessions')
      .select('*')
      .eq('qr_code_token', token)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ error: 'Invalid token or session not found' });
    }

    // Check max attendees
    if (session.max_attendees) {
      const { count } = await supabaseAdmin
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', session.id);

      if (count && count >= session.max_attendees) {
        return res.status(403).json({ error: 'Session is full' });
      }
    }

    // Check if user exists by email, otherwise create new user
    let userId: string;
    if (email) {
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (existingUser) {
        // Update existing user
        const { data: updatedUser } = await supabaseAdmin
          .from('users')
          .update({
            name,
            company: company || existingUser.company,
            job_title: jobTitle || existingUser.job_title,
            bio: bio || existingUser.bio,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingUser.id)
          .select()
          .single();
        
        userId = updatedUser!.id;
      } else {
        // Create new user
        const { data: newUser } = await supabaseAdmin
          .from('users')
          .insert({
            name,
            email,
            company: company || '',
            job_title: jobTitle || '',
            bio: bio || '',
          })
          .select()
          .single();
        
        userId = newUser!.id;
      }
    } else {
      // No email provided, create anonymous user
      const { data: newUser } = await supabaseAdmin
        .from('users')
        .insert({
          name,
          email: '',
          company: company || '',
          job_title: jobTitle || '',
          bio: bio || '',
        })
        .select()
        .single();
      
      userId = newUser!.id;
    }

    // Add attendance record
    const { data: attendance, error: attendanceError } = await supabaseAdmin
      .from('attendance')
      .insert({
        user_id: userId,
        session_id: session.id,
        custom_name: name,
        custom_bio: bio,
        custom_interests: company && jobTitle ? [jobTitle, company] : null,
      })
      .select()
      .single();

    if (attendanceError) {
      if (attendanceError.code === '23505') {
        return res.status(409).json({ error: 'Already joined this session' });
      }
      throw attendanceError;
    }

    // Create ATTENDED relationship in Neo4j
    const driver = getNeo4jDriver();
    const neoSession = driver.session();
    try {
      await neoSession.run(
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
          eventId: session.id,
        }
      );
    } finally {
      await neoSession.close();
    }

    // Generate embedding if bio exists
    if (bio && bio.trim()) {
      try {
        const embeddingText = `${name} - ${jobTitle || ''} at ${company || ''}. ${bio}`;
        const embedding = await generateEmbedding(embeddingText);

        await supabaseAdmin.from('vectors').insert({
          owner_type: 'person',
          owner_id: userId,
          embedding: JSON.stringify(embedding),
          text_content: embeddingText,
        });
      } catch (error) {
        console.error('Error generating embedding:', error);
      }
    }

    res.json({
      success: true,
      attendance,
      session,
    });
  } catch (error: any) {
    console.error('Error joining session anonymously:', error);
    res.status(500).json({ error: 'Failed to join session' });
  }
});

/**
 * POST /api/sessions/join
 * Join a session via QR code token (requires authentication)
 */
router.post('/join', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { token, custom_name, custom_bio, custom_interests } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Get user profile
    const profile = await getUserByAuthId(user.id);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Find session by token
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('network_sessions')
      .select('*')
      .eq('qr_code_token', token)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ error: 'Invalid token or session not found' });
    }

    // Check max attendees
    if (session.max_attendees) {
      const { count } = await supabaseAdmin
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', session.id);

      if (count && count >= session.max_attendees) {
        return res.status(403).json({ error: 'Session is full' });
      }
    }

    // Add attendance record
    const { data: attendance, error: attendanceError } = await supabaseAdmin
      .from('attendance')
      .insert({
        user_id: profile.id,
        session_id: session.id,
        custom_name,
        custom_bio,
        custom_interests,
      })
      .select()
      .single();

    if (attendanceError) {
      if (attendanceError.code === '23505') {
        return res.status(409).json({ error: 'Already joined this session' });
      }
      throw attendanceError;
    }

    // Create ATTENDED relationship in Neo4j
    const driver = getNeo4jDriver();
    const neoSession = driver.session();
    try {
      await neoSession.run(
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
          userId: profile.id,
          name: profile.name,
          email: profile.email || '',
          company: profile.company || '',
          jobTitle: profile.job_title || '',
          bio: profile.bio || '',
          eventId: session.id,
        }
      );
    } finally {
      await neoSession.close();
    }

    // Generate embedding if bio exists
    if (profile.bio) {
      try {
        const embeddingText = `${profile.name} - ${profile.job_title || ''} at ${profile.company || ''}. ${profile.bio}`;
        const embedding = await generateEmbedding(embeddingText);

        await supabaseAdmin.from('vectors').insert({
          owner_type: 'person',
          owner_id: profile.id,
          embedding: JSON.stringify(embedding),
          text_content: embeddingText,
        });
      } catch (error) {
        console.error('Error generating embedding:', error);
      }
    }

    res.json({
      success: true,
      attendance,
      session,
    });
  } catch (error: any) {
    console.error('Error joining session:', error);
    res.status(500).json({ error: 'Failed to join session' });
  }
});

/**
 * GET /api/sessions/verify/:token
 * Verify a QR code token and return session details
 */
router.get('/verify/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const { data, error } = await supabaseAdmin
      .from('network_sessions')
      .select('*')
      .eq('qr_code_token', token)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Invalid token' });
    }

    res.json(data);
  } catch (error: any) {
    console.error('Error verifying token:', error);
    res.status(500).json({ error: 'Failed to verify token' });
  }
});

export default router;

