import { Router, Request, Response } from 'express';
import { supabase, supabaseAdmin, getUserByAuthId } from '../config/supabase';
import { generateEmbedding } from '../config/openai';
import { getNeo4jDriver } from '../config/database';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Middleware to verify authentication
 */
const requireAuth = async (req: Request, res: Response, next: any) => {
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

    // Attach user to request
    (req as any).user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

/**
 * GET /api/profile
 * Get current user's profile
 * Auto-creates profile if it doesn't exist (handles edge cases)
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    let profile = await getUserByAuthId(user.id);

    // Auto-create profile if it doesn't exist
    if (!profile) {
      console.log(`Creating missing profile for user ${user.id}`);
      
      const { data, error } = await supabaseAdmin
        .from('users')
        .insert({
          auth_id: user.id,
          email: user.email,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error auto-creating profile:', error);
        return res.status(500).json({ error: 'Failed to create profile' });
      }

      profile = data;
    }

    res.json(profile);
  } catch (error: any) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

/**
 * PUT /api/profile
 * Update current user's profile
 */
router.put('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const {
      name,
      phone,
      company,
      job_title,
      bio,
      interests,
      linkedin_url,
      twitter_url,
      website_url,
    } = req.body;

    // Get current profile
    const currentProfile = await getUserByAuthId(user.id);

    if (!currentProfile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Update profile
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({
        name,
        phone,
        company,
        job_title,
        bio,
        interests,
        linkedin_url,
        twitter_url,
        website_url,
        updated_at: new Date().toISOString(),
      })
      .eq('auth_id', user.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Update Neo4j Person node
    const driver = getNeo4jDriver();
    const session = driver.session();
    try {
      await session.run(
        `MERGE (p:Person {id: $id})
         SET p.name = $name,
             p.email = $email,
             p.company = $company,
             p.jobTitle = $jobTitle,
             p.bio = $bio`,
        {
          id: data.id,
          name: data.name,
          email: data.email || '',
          company: company || '',
          jobTitle: job_title || '',
          bio: bio || '',
        }
      );
    } finally {
      await session.close();
    }

    // Generate and update embedding if bio changed
    if (bio && bio !== currentProfile.bio) {
      try {
        const embeddingText = `${name} - ${job_title || ''} at ${company || ''}. ${bio}`;
        const embedding = await generateEmbedding(embeddingText);

        // Delete old embedding
        await supabaseAdmin
          .from('vectors')
          .delete()
          .eq('owner_type', 'person')
          .eq('owner_id', data.id);

        // Insert new embedding
        await supabaseAdmin.from('vectors').insert({
          owner_type: 'person',
          owner_id: data.id,
          embedding: JSON.stringify(embedding),
          text_content: embeddingText,
        });
      } catch (error) {
        console.error('Error updating embedding:', error);
        // Continue even if embedding fails
      }
    }

    res.json(data);
  } catch (error: any) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

/**
 * POST /api/profile/photo
 * Upload profile photo
 */
router.post('/photo', requireAuth, upload.single('photo'), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Get current profile
    const profile = await getUserByAuthId(user.id);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Upload to Supabase Storage
    const fileName = `${user.id}-${Date.now()}.${file.mimetype.split('/')[1]}`;
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('profile-photos')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('profile-photos')
      .getPublicUrl(fileName);

    // Update profile with photo URL
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({
        photo_url: urlData.publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('auth_id', user.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({
      photo_url: urlData.publicUrl,
      profile: data,
    });
  } catch (error: any) {
    console.error('Error uploading photo:', error);
    res.status(500).json({ error: 'Failed to upload photo' });
  }
});

/**
 * GET /api/profile/:id
 * Get any user's profile by ID (public)
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(data);
  } catch (error: any) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

export default router;
export { requireAuth };

