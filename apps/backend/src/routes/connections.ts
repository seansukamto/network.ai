import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { getNeo4jDriver } from '../config/database';
import { requireAuth } from './profile';

const router = Router();

/**
 * GET /api/connections
 * Get all connections for the authenticated user
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Get connections with full profile data
    const { data, error } = await supabaseAdmin
      .from('connections')
      .select(`
        id,
        created_at,
        updated_at,
        met_at_session_name,
        status,
        tags,
        connection:connection_id (
          id,
          name,
          email,
          phone,
          photo_url,
          company,
          job_title,
          bio,
          interests,
          linkedin_url,
          twitter_url,
          website_url
        ),
        session:met_at_session_id (
          id,
          name,
          date,
          location
        )
      `)
      .eq('user_id', profile.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json(data || []);
  } catch (error: any) {
    console.error('Error fetching connections:', error);
    res.status(500).json({ error: 'Failed to fetch connections' });
  }
});

/**
 * POST /api/connections
 * Add a new connection
 */
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { connection_id, session_id, tags } = req.body;

    if (!connection_id) {
      return res.status(400).json({ error: 'connection_id is required' });
    }

    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Get session name if session_id provided
    let sessionName = null;
    if (session_id) {
      const { data: session } = await supabaseAdmin
        .from('network_sessions')
        .select('name')
        .eq('id', session_id)
        .single();

      sessionName = session?.name;
    }

    // Create connection
    const { data, error } = await supabaseAdmin
      .from('connections')
      .insert({
        user_id: profile.id,
        connection_id,
        met_at_session_id: session_id || null,
        met_at_session_name: sessionName,
        tags: tags || [],
        status: 'active',
      })
      .select(`
        *,
        connection:connection_id (
          id,
          name,
          email,
          photo_url,
          company,
          job_title,
          bio
        )
      `)
      .single();

    if (error) {
      if (error.code === '23505') {
        // Unique constraint violation
        return res.status(409).json({ error: 'Connection already exists' });
      }
      throw error;
    }

    // Create MET_AT relationship in Neo4j
    if (session_id) {
      const driver = getNeo4jDriver();
      const session = driver.session();
      try {
        await session.run(
          `MATCH (a:Person {id: $userAId}), (b:Person {id: $userBId})
           MERGE (a)-[r:MET_AT]->(b)
           MERGE (b)-[r2:MET_AT]->(a)
           SET r.eventId = $eventId, r.at = datetime()
           SET r2.eventId = $eventId, r2.at = datetime()`,
          {
            userAId: profile.id,
            userBId: connection_id,
            eventId: session_id,
          }
        );
      } finally {
        await session.close();
      }
    }

    res.json(data);
  } catch (error: any) {
    console.error('Error adding connection:', error);
    res.status(500).json({ error: 'Failed to add connection' });
  }
});

/**
 * PUT /api/connections/:id
 * Update a connection (tags, status)
 */
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { tags, status } = req.body;

    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Update connection
    const { data, error } = await supabaseAdmin
      .from('connections')
      .update({
        tags,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', profile.id) // Ensure user owns this connection
      .select()
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    res.json(data);
  } catch (error: any) {
    console.error('Error updating connection:', error);
    res.status(500).json({ error: 'Failed to update connection' });
  }
});

/**
 * DELETE /api/connections/:id
 * Delete a connection
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Delete connection
    const { error } = await supabaseAdmin
      .from('connections')
      .delete()
      .eq('id', id)
      .eq('user_id', profile.id);

    if (error) {
      throw error;
    }

    res.json({ success: true, message: 'Connection deleted' });
  } catch (error: any) {
    console.error('Error deleting connection:', error);
    res.status(500).json({ error: 'Failed to delete connection' });
  }
});

/**
 * GET /api/connections/:id/notes
 * Get all notes for a specific connection
 */
router.get('/:id/notes', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id: connection_id } = req.params;

    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Get notes
    const { data, error } = await supabaseAdmin
      .from('connection_notes')
      .select('*')
      .eq('user_id', profile.id)
      .eq('connection_id', connection_id)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json(data || []);
  } catch (error: any) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

/**
 * POST /api/connections/:id/notes
 * Add a note to a connection
 */
router.post('/:id/notes', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id: connection_id } = req.params;
    const { note_text, note_type } = req.body;

    if (!note_text) {
      return res.status(400).json({ error: 'note_text is required' });
    }

    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Create note
    const { data, error } = await supabaseAdmin
      .from('connection_notes')
      .insert({
        user_id: profile.id,
        connection_id,
        note_text,
        note_type: note_type || 'general',
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json(data);
  } catch (error: any) {
    console.error('Error adding note:', error);
    res.status(500).json({ error: 'Failed to add note' });
  }
});

export default router;

