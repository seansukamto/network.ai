import { Router, Request, Response } from 'express';
import { supabaseAdmin, getUserByAuthId } from '../config/supabase';
import { requireAuth } from './profile';
import { google } from 'googleapis';
import { generateText } from '../config/openai';

const router = Router();

/**
 * GET /api/integrations/gmail/oauth-url
 * Get Gmail OAuth URL
 */
router.get('/gmail/oauth-url', requireAuth, async (req: Request, res: Response) => {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.FRONTEND_URL}/integrations/callback`
    );

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/calendar',
      ],
    });

    res.json({ url: authUrl });
  } catch (error: any) {
    console.error('Error generating OAuth URL:', error);
    res.status(500).json({ error: 'Failed to generate OAuth URL' });
  }
});

/**
 * POST /api/integrations/gmail/draft
 * Draft an email to a connection (AI-assisted)
 */
router.post('/gmail/draft', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { connection_id, context } = req.body;

    if (!connection_id) {
      return res.status(400).json({ error: 'connection_id is required' });
    }

    // Get user profile
    const profile = await getUserByAuthId(user.id);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Get connection details
    const { data: connection } = await supabaseAdmin
      .from('connections')
      .select(`
        *,
        connection:connection_id (
          name,
          email,
          company,
          job_title
        ),
        session:met_at_session_id (
          name,
          date,
          location
        )
      `)
      .eq('id', connection_id)
      .eq('user_id', profile.id)
      .single();

    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    // Get notes for context
    const { data: notes } = await supabaseAdmin
      .from('connection_notes')
      .select('note_text')
      .eq('user_id', profile.id)
      .eq('connection_id', connection.connection.id)
      .order('created_at', { ascending: false })
      .limit(3);

    // Generate email using Claude
    const prompt = `You are helping ${profile.name} draft a professional but friendly introduction email to ${connection.connection.name}.

Context:
- They met at: ${connection.session?.name || 'a networking event'}
- ${connection.connection.name} works as ${connection.connection.job_title} at ${connection.connection.company}
- ${profile.name} works as ${profile.job_title || 'professional'} at ${profile.company || 'their company'}
${notes && notes.length > 0 ? `- Notes from their meeting: ${notes.map(n => n.note_text).join('; ')}` : ''}
${context ? `- Additional context: ${context}` : ''}

Write a professional email that:
1. Reminds them of where they met
2. References something specific from their conversation (if notes available)
3. Suggests staying in touch or having a follow-up conversation
4. Is warm but professional, about 150-200 words

Return ONLY the email body in plain text (no subject line, no JSON).`;

    const emailBody = await generateText(prompt, undefined, 0.7);

    const subject = `Great meeting you at ${connection.session?.name || 'the event'}!`;

    res.json({
      to: connection.connection.email,
      subject,
      body: emailBody,
      connection: connection.connection,
    });
  } catch (error: any) {
    console.error('Error drafting email:', error);
    res.status(500).json({ error: 'Failed to draft email' });
  }
});

/**
 * POST /api/integrations/calendar/suggest-times
 * Suggest meeting times with a connection (AI-assisted)
 */
router.post('/calendar/suggest-times', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { connection_id, duration_minutes, preferred_time } = req.body;

    if (!connection_id) {
      return res.status(400).json({ error: 'connection_id is required' });
    }

    // Get user profile
    const profile = await getUserByAuthId(user.id);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Get connection details
    const { data: connection } = await supabaseAdmin
      .from('connections')
      .select(`
        *,
        connection:connection_id (
          id,
          name,
          email
        )
      `)
      .eq('id', connection_id)
      .eq('user_id', profile.id)
      .single();

    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    // Get user's Google tokens
    const { data: tokens } = await supabaseAdmin
      .from('oauth_tokens')
      .select('*')
      .eq('user_id', profile.id)
      .eq('provider', 'google')
      .single();

    if (!tokens) {
      return res.status(403).json({
        error: 'Google Calendar not connected',
        message: 'Please connect your Google Calendar first',
      });
    }

    // Use Google Calendar API to find available times
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Get free/busy information for next 7 days
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: now.toISOString(),
        timeMax: nextWeek.toISOString(),
        items: [{ id: 'primary' }],
      },
    });

    const busy = response.data.calendars?.primary?.busy || [];

    // Simple algorithm: suggest 3 time slots
    const suggestions = [];
    const durationMs = (duration_minutes || 30) * 60 * 1000;

    for (let day = 1; day <= 7; day++) {
      const checkDate = new Date(now);
      checkDate.setDate(checkDate.getDate() + day);
      checkDate.setHours(preferred_time === 'morning' ? 10 : preferred_time === 'afternoon' ? 14 : 10, 0, 0, 0);

      const endTime = new Date(checkDate.getTime() + durationMs);

      // Check if this slot is free
      const isFree = !busy.some((period: any) => {
        const busyStart = new Date(period.start);
        const busyEnd = new Date(period.end);
        return (
          (checkDate >= busyStart && checkDate < busyEnd) ||
          (endTime > busyStart && endTime <= busyEnd)
        );
      });

      if (isFree && suggestions.length < 3) {
        suggestions.push({
          start: checkDate.toISOString(),
          end: endTime.toISOString(),
          day: checkDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
          time: checkDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        });
      }
    }

    res.json({
      connection: connection.connection,
      suggestions,
      duration_minutes: duration_minutes || 30,
    });
  } catch (error: any) {
    console.error('Error suggesting meeting times:', error);
    res.status(500).json({ error: 'Failed to suggest meeting times' });
  }
});

/**
 * POST /api/integrations/calendar/create-event
 * Create a calendar event with a connection
 */
router.post('/calendar/create-event', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { connection_id, title, start_time, end_time, location, notes } = req.body;

    if (!connection_id || !start_time || !end_time) {
      return res.status(400).json({ error: 'connection_id, start_time, and end_time are required' });
    }

    // Get user profile
    const profile = await getUserByAuthId(user.id);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Get connection
    const { data: connection } = await supabaseAdmin
      .from('connections')
      .select(`
        connection:connection_id (
          name,
          email
        )
      `)
      .eq('id', connection_id)
      .eq('user_id', profile.id)
      .single();

    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    // Extract connection details (Supabase returns nested object)
    const connectedUser = (connection as any).connection as { name: string; email: string };

    // Get Google tokens
    const { data: tokens } = await supabaseAdmin
      .from('oauth_tokens')
      .select('*')
      .eq('user_id', profile.id)
      .eq('provider', 'google')
      .single();

    if (!tokens) {
      return res.status(403).json({ error: 'Google Calendar not connected' });
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const event = {
      summary: title || `Coffee chat with ${connectedUser.name}`,
      description: notes || `Meeting scheduled via network.ai`,
      location: location || 'TBD',
      start: {
        dateTime: start_time,
        timeZone: 'UTC',
      },
      end: {
        dateTime: end_time,
        timeZone: 'UTC',
      },
      attendees: [
        { email: connectedUser.email },
      ],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 30 },
        ],
      },
    };

    const result = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      sendUpdates: 'all',
    });

    res.json({
      success: true,
      event_id: result.data.id,
      event_link: result.data.htmlLink,
      message: 'Calendar event created and invite sent',
    });
  } catch (error: any) {
    console.error('Error creating calendar event:', error);
    res.status(500).json({ error: 'Failed to create calendar event' });
  }
});

export default router;

