import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Supabase client for database operations
 * Uses service role key for backend operations (bypasses RLS)
 */
export const supabaseAdmin: SupabaseClient = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Supabase client with anon key (for RLS-respecting operations)
 */
export const supabase: SupabaseClient = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || '',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
    },
  }
);

/**
 * Test Supabase connection
 */
export const testSupabaseConnection = async (): Promise<void> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('count')
      .limit(1);

    if (error) {
      console.error('❌ Supabase connection failed:', error.message);
      throw error;
    }

    console.log('✅ Supabase connected');
  } catch (error) {
    console.error('❌ Supabase connection error:', error);
    throw error;
  }
};

/**
 * Get user by auth ID
 */
export const getUserByAuthId = async (authId: string) => {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('auth_id', authId)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 is "not found" error
    throw error;
  }

  return data;
};

/**
 * Create or update user profile
 */
export const upsertUserProfile = async (authId: string, profile: any) => {
  const { data, error } = await supabaseAdmin
    .from('users')
    .upsert(
      {
        auth_id: authId,
        ...profile,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'auth_id',
      }
    )
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

