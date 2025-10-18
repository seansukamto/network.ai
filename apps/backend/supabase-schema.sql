-- ============================================
-- SUPABASE DATABASE SCHEMA
-- network.ai - Networking App
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- USERS TABLE (with authentication integration)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID UNIQUE, -- Links to Supabase Auth user

-- Profile Information
name TEXT NOT NULL, email TEXT, phone TEXT, photo_url TEXT,

-- Professional Information
company TEXT,
  job_title TEXT,
  bio TEXT,
  interests TEXT[], -- Array of interests/tags

-- Social Links (optional)
linkedin_url TEXT, twitter_url TEXT, website_url TEXT,

-- Metadata

created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT users_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$' OR email IS NULL)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users (auth_id);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- ============================================
-- NETWORK SESSIONS TABLE (formerly events)
-- ============================================
CREATE TABLE IF NOT EXISTS network_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

-- Session Information
name TEXT NOT NULL,
description TEXT,
date TIMESTAMP
WITH
    TIME ZONE DEFAULT NOW(),
    location TEXT,

-- QR Code for joining
qr_code_token TEXT UNIQUE NOT NULL DEFAULT uuid_generate_v4()::TEXT,

-- Session Settings
host_user_id UUID REFERENCES users (id) ON DELETE SET NULL,
is_active BOOLEAN DEFAULT TRUE,
max_attendees INTEGER,

-- Metadata
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_sessions_qr_code ON network_sessions (qr_code_token);

CREATE INDEX IF NOT EXISTS idx_sessions_host ON network_sessions (host_user_id);

CREATE INDEX IF NOT EXISTS idx_sessions_date ON network_sessions (date);

-- ============================================
-- ATTENDANCE TABLE (who joined which session)
-- ============================================


CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES network_sessions(id) ON DELETE CASCADE,

-- Custom profile for this specific session (optional overrides)
custom_name TEXT, custom_bio TEXT, custom_interests TEXT[],

-- Timestamps
joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

-- Ensure one attendance record per user per session
CONSTRAINT unique_user_session UNIQUE (user_id, session_id) );

-- Indexes for queries
CREATE INDEX IF NOT EXISTS idx_attendance_user ON attendance (user_id);

CREATE INDEX IF NOT EXISTS idx_attendance_session ON attendance (session_id);

-- ============================================
-- CONNECTIONS TABLE (saved contacts)
-- ============================================
CREATE TABLE IF NOT EXISTS connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

-- Who saved whom
user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
connection_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,

-- Context of connection
met_at_session_id UUID REFERENCES network_sessions (id) ON DELETE SET NULL,
met_at_session_name TEXT, -- Denormalized for when session is deleted

-- Connection metadata
status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'blocked')),
  tags TEXT[], -- User-defined tags

-- Timestamps
created_at TIMESTAMP
WITH
    TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP
WITH
    TIME ZONE DEFAULT NOW(),

-- Prevent duplicate connections and self-connections
CONSTRAINT unique_connection UNIQUE (user_id, connection_id),
  CONSTRAINT no_self_connection CHECK (user_id != connection_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_connections_user ON connections (user_id);

CREATE INDEX IF NOT EXISTS idx_connections_connection ON connections (connection_id);

CREATE INDEX IF NOT EXISTS idx_connections_session ON connections (met_at_session_id);

-- ============================================
-- CONNECTION NOTES TABLE (multiple notes per connection)
-- ============================================
CREATE TABLE IF NOT EXISTS connection_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

-- Links to connection
user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
connection_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,

-- Note content
note_text TEXT NOT NULL,
note_type TEXT DEFAULT 'general' CHECK (
    note_type IN (
        'general',
        'meeting',
        'followup',
        'idea',
        'reminder'
    )
),

-- Timestamps
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notes_user ON connection_notes (user_id);

CREATE INDEX IF NOT EXISTS idx_notes_connection ON connection_notes (connection_id);

CREATE INDEX IF NOT EXISTS idx_notes_created ON connection_notes (created_at DESC);

-- ============================================
-- VECTORS TABLE (for RAG/semantic search)
-- ============================================
CREATE TABLE IF NOT EXISTS vectors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

-- What this vector represents
owner_type TEXT NOT NULL CHECK (
    owner_type IN ('person', 'note', 'session')
),
owner_id UUID NOT NULL,

-- Vector embedding
embedding vector (1536), -- OpenAI text-embedding-3-small dimension

-- Original text
text_content TEXT NOT NULL,

-- Metadata
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() );

-- Vector similarity index (for fast cosine similarity search)
CREATE INDEX IF NOT EXISTS idx_vectors_embedding ON vectors USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_vectors_owner ON vectors (owner_type, owner_id);

-- ============================================
-- OAUTH TOKENS TABLE (for Gmail, Calendar integration)
-- ============================================


CREATE TABLE IF NOT EXISTS oauth_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

-- OAuth provider
provider TEXT NOT NULL CHECK (
    provider IN (
        'google',
        'microsoft',
        'apple'
    )
),

-- Tokens
access_token TEXT NOT NULL,
refresh_token TEXT,
token_expiry TIMESTAMP
WITH
    TIME ZONE,

-- Scopes granted
scopes TEXT[],

-- Metadata
created_at TIMESTAMP
WITH
    TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP
WITH
    TIME ZONE DEFAULT NOW(),

-- One token set per user per provider
CONSTRAINT unique_user_provider UNIQUE (user_id, provider) );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_oauth_user ON oauth_tokens (user_id);

CREATE INDEX IF NOT EXISTS idx_oauth_provider ON oauth_tokens (provider);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

ALTER TABLE network_sessions ENABLE ROW LEVEL SECURITY;

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

ALTER TABLE connection_notes ENABLE ROW LEVEL SECURITY;

ALTER TABLE vectors ENABLE ROW LEVEL SECURITY;

ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Users: Can read all, but only update own profile
CREATE POLICY "Users can view all profiles" ON users FOR
SELECT USING (true);

CREATE POLICY "Users can update own profile" ON users FOR
UPDATE USING (auth.uid () = auth_id);

CREATE POLICY "Users can insert own profile" ON users FOR
INSERT
WITH
    CHECK (auth.uid () = auth_id);

-- Network Sessions: All can read, authenticated users can create
CREATE POLICY "Anyone can view sessions" ON network_sessions FOR
SELECT USING (true);

CREATE POLICY "Authenticated users can create sessions" ON network_sessions FOR
INSERT
WITH
    CHECK (auth.uid () IS NOT NULL);

CREATE POLICY "Host can update own sessions" ON network_sessions FOR
UPDATE USING (
    auth.uid () = (
        SELECT auth_id
        FROM users
        WHERE
            id = host_user_id
    )
);

-- Attendance: Public read, users can manage own attendance
CREATE POLICY "Anyone can view attendance" ON attendance FOR
SELECT USING (true);

CREATE POLICY "Users can join sessions" ON attendance FOR
INSERT
WITH
    CHECK (
        auth.uid () = (
            SELECT auth_id
            FROM users
            WHERE
                id = user_id
        )
    );

CREATE POLICY "Users can update own attendance" ON attendance FOR
UPDATE USING (
    auth.uid () = (
        SELECT auth_id
        FROM users
        WHERE
            id = user_id
    )
);

-- Connections: Users can only see and manage their own connections
CREATE POLICY "Users can view own connections" ON connections FOR
SELECT USING (
        auth.uid () = (
            SELECT auth_id
            FROM users
            WHERE
                id = user_id
        )
    );

CREATE POLICY "Users can create own connections" ON connections FOR
INSERT
WITH
    CHECK (
        auth.uid () = (
            SELECT auth_id
            FROM users
            WHERE
                id = user_id
        )
    );

CREATE POLICY "Users can update own connections" ON connections FOR
UPDATE USING (
    auth.uid () = (
        SELECT auth_id
        FROM users
        WHERE
            id = user_id
    )
);

CREATE POLICY "Users can delete own connections" ON connections FOR DELETE USING (
    auth.uid () = (
        SELECT auth_id
        FROM users
        WHERE
            id = user_id
    )
);

-- Connection Notes: Users can only see and manage their own notes
CREATE POLICY "Users can view own notes" ON connection_notes FOR
SELECT USING (
        auth.uid () = (
            SELECT auth_id
            FROM users
            WHERE
                id = user_id
        )
    );

CREATE POLICY "Users can create own notes" ON connection_notes FOR
INSERT
WITH
    CHECK (
        auth.uid () = (
            SELECT auth_id
            FROM users
            WHERE
                id = user_id
        )
    );

CREATE POLICY "Users can update own notes" ON connection_notes FOR
UPDATE USING (
    auth.uid () = (
        SELECT auth_id
        FROM users
        WHERE
            id = user_id
    )
);

CREATE POLICY "Users can delete own notes" ON connection_notes FOR DELETE USING (
    auth.uid () = (
        SELECT auth_id
        FROM users
        WHERE
            id = user_id
    )
);

-- Vectors: Service role only (managed by backend)
CREATE POLICY "Service role can manage vectors" ON vectors FOR ALL USING (
    auth.jwt () ->> 'role' = 'service_role'
);

-- OAuth Tokens: Users can only access their own tokens
CREATE POLICY "Users can view own tokens" ON oauth_tokens FOR
SELECT USING (
        auth.uid () = (
            SELECT auth_id
            FROM users
            WHERE
                id = user_id
        )
    );

CREATE POLICY "Users can manage own tokens" ON oauth_tokens FOR ALL USING (
    auth.uid () = (
        SELECT auth_id
        FROM users
        WHERE
            id = user_id
    )
);

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-create user profile when auth user is created
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (auth_id, email, name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email, 'User'),
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create user profile on auth signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON network_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_connections_updated_at BEFORE UPDATE ON connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON connection_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_oauth_updated_at BEFORE UPDATE ON oauth_tokens FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- REALTIME PUBLICATION (for Supabase Realtime)
-- ============================================

-- Enable realtime for tables that need live updates
ALTER PUBLICATION supabase_realtime ADD TABLE attendance;

ALTER PUBLICATION supabase_realtime ADD TABLE network_sessions;

ALTER PUBLICATION supabase_realtime ADD TABLE connections;

-- ============================================
-- SAMPLE DATA (for testing)
-- ============================================

-- Note: Insert sample data after authentication is set up
-- Users will be created via Supabase Auth

COMMENT ON
TABLE users IS 'User profiles with professional information';

COMMENT ON
TABLE network_sessions IS 'Networking events/sessions where people connect';

COMMENT ON
TABLE attendance IS 'Records of who attended which sessions';

COMMENT ON TABLE connections IS 'Saved connections between users';

COMMENT ON
TABLE connection_notes IS 'Notes users make about their connections';

COMMENT ON TABLE vectors IS 'Vector embeddings for semantic search';

COMMENT ON
TABLE oauth_tokens IS 'OAuth tokens for third-party integrations (Gmail, Calendar)';