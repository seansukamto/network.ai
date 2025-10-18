import { Router, Request, Response } from 'express';
import { supabase, supabaseAdmin, getUserByAuthId, upsertUserProfile } from '../config/supabase';
import { google } from 'googleapis';

const router = Router();

/**
 * POST /api/auth/signup
 * Sign up with email and password
 */
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for MVP
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    // Create user profile
    const profile = await upsertUserProfile(authData.user.id, {
      name,
      email,
    });

    res.json({
      user: authData.user,
      profile,
    });
  } catch (error: any) {
    console.error('Error during signup:', error);
    res.status(500).json({ error: 'Failed to sign up' });
  }
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    // Get user profile
    const profile = await getUserByAuthId(data.user.id);

    res.json({
      session: data.session,
      user: data.user,
      profile,
    });
  } catch (error: any) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

/**
 * POST /api/auth/logout
 * Logout current user
 */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error: any) {
    console.error('Error during logout:', error);
    res.status(500).json({ error: 'Failed to logout' });
  }
});

/**
 * GET /api/auth/google
 * Initiate Google OAuth flow
 */
router.get('/google', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${process.env.FRONTEND_URL}/auth/callback`,
        scopes: 'openid email profile https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/calendar',
      },
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ url: data.url });
  } catch (error: any) {
    console.error('Error initiating Google OAuth:', error);
    res.status(500).json({ error: 'Failed to initiate Google login' });
  }
});

/**
 * GET /api/auth/session
 * Get current session
 */
router.get('/session', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    // Get user profile
    const profile = await getUserByAuthId(user.id);

    res.json({
      user,
      profile,
    });
  } catch (error: any) {
    console.error('Error getting session:', error);
    res.status(500).json({ error: 'Failed to get session' });
  }
});

/**
 * POST /api/auth/google/tokens
 * Save Google OAuth tokens for MCP (Gmail, Calendar)
 */
router.post('/google/tokens', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const { access_token, refresh_token, expires_at, scopes } = req.body;

    // Get user profile to get user_id
    const profile = await getUserByAuthId(user.id);

    if (!profile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    // Store OAuth tokens
    const { data, error: insertError } = await supabaseAdmin
      .from('oauth_tokens')
      .upsert({
        user_id: profile.id,
        provider: 'google',
        access_token,
        refresh_token,
        token_expiry: new Date(expires_at * 1000).toISOString(),
        scopes: scopes || [],
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    res.json({
      success: true,
      message: 'Google tokens saved',
    });
  } catch (error: any) {
    console.error('Error saving Google tokens:', error);
    res.status(500).json({ error: 'Failed to save tokens' });
  }
});

export default router;

