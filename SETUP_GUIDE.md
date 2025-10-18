# 🚀 Setup Guide for network.ai

This guide will walk you through setting up your upgraded networking app for a live demo.

## 📋 Prerequisites

Before you begin, ensure you have:

- ✅ Node.js 20+ and npm installed
- ✅ Docker Desktop installed and running
- ✅ OpenAI API key (you have this)
- ✅ Claude (Anthropic) API key (you have this)

## 🔑 API Keys & Accounts You Need to Create

### 1. **Supabase Account** (FREE)

**Steps:**

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up with GitHub or email
4. Create a new project:
   - Project name: `network` (or your choice)
   - Database password: Create a strong password (save it!)
   - Region: Choose closest to you
5. Wait 2-3 minutes for project to provision

**Get your keys:**

- Go to **Settings** → **API**
- Copy:
  - `Project URL` → This is your `SUPABASE_URL`
  - `anon` `public` key → This is your `SUPABASE_ANON_KEY`
  - `service_role` `secret` key → This is your `SUPABASE_SERVICE_ROLE_KEY` ⚠️ Keep secret!

### 2. **ElevenLabs Account** (FREE tier)

**Steps:**

1. Go to [https://elevenlabs.io](https://elevenlabs.io)
2. Sign up (free tier: 10,000 characters/month)
3. After signup, go to **Profile** → **API Keys**
4. Click "Generate API Key"
5. Copy the key → This is your `ELEVENLABS_API_KEY`

**Optional: Choose a voice:**

- Go to **VoiceLab** → Browse voices
- Click on a voice and copy its ID (e.g., `21m00Tcm4TlvDq8ikWAM` for Rachel)
- Use this as `ELEVENLABS_VOICE_ID`

### 3. **Google Cloud Console** (FREE for Gmail & Calendar APIs)

**Steps:**

1. Go to [https://console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project: "cursor-hackathon"
3. Enable APIs:
   - Search for "Gmail API" → Enable
   - Search for "Google Calendar API" → Enable
4. Create OAuth credentials:
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Name: "cursor-hackathon"
   - Authorized redirect URIs:
     - `http://localhost:5173/integrations/callback` (for local dev)
     - Add your production URL later
   - Click **Create**
5. Copy:
   - **Client ID** → This is your `GOOGLE_CLIENT_ID`
   - **Client Secret** → This is your `GOOGLE_CLIENT_SECRET`

---

## 🗄️ Database Setup

### Step 1: Set up Supabase Database

1. Go to your Supabase project dashboard
2. Click on **SQL Editor** (left sidebar)
3. Click **New query**
4. Copy the entire contents of `apps/backend/supabase-schema.sql`
5. Paste into the SQL editor
6. Click **Run**

**Create Vector Search Function:**

```sql
-- In Supabase SQL Editor, run this:
CREATE OR REPLACE FUNCTION match_vectors (
  query_embedding TEXT,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  owner_type TEXT,
  owner_id UUID,
  text_content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id,
    v.owner_type,
    v.owner_id,
    v.text_content,
    1 - (v.embedding <#> query_embedding::vector) AS similarity
  FROM vectors v
  WHERE 1 - (v.embedding <#> query_embedding::vector) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
```

### Step 2: Create Storage Bucket for Profile Photos

1. In Supabase dashboard, go to **Storage**
2. Click **New bucket**
3. Bucket name: `profile-photos`
4. Make it **Public** (check the box)
5. Click **Create bucket**

### Step 3: Set up Supabase Auth

1. Go to **Authentication** → **Providers**
2. Enable **Email** provider (should be on by default)
3. Enable **Google** provider:
   - Toggle it on
   - Paste your `GOOGLE_CLIENT_ID`
   - Paste your `GOOGLE_CLIENT_SECRET`
   - Click **Save**

### Step 4: Start Neo4j (unchanged)

```bash
cd docker
./start
```

This starts your Neo4j database for relationship graphs.

---

## ⚙️ Environment Configuration

### Backend Environment (.env)

Create `apps/backend/.env`:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Neo4j
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=test

# AI
ANTHROPIC_API_KEY=sk-ant-api03-... (your Claude key)
OPENAI_API_KEY=sk-proj-... (your OpenAI key)

# Voice
ELEVENLABS_API_KEY=your_elevenlabs_key_here
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM

# Google
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback

# Server
PORT=3001
FRONTEND_URL=http://localhost:5173

# MCP Server Ports
MCP_SUPABASE_PORT=3002
MCP_GMAIL_PORT=3003
MCP_CALENDAR_PORT=3004
```

### Frontend Environment (.env)

Create `apps/frontend/.env`:

```env
VITE_API_URL=http://localhost:3001/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
```

---

## 📦 Installation

```bash
# Install all dependencies
npm install --workspaces
```

---

## 🏃 Running the App Locally

### Terminal 1: Start Neo4j (if not already running)

```bash
cd docker
./start
```

### Terminal 2: Start Backend

```bash
cd apps/backend
npm run dev
```

You should see:

```
✅ Supabase connected
✅ Neo4j connected
🚀 Server running on http://localhost:3001
```

### Terminal 3: Start Frontend

```bash
cd apps/frontend
npm run dev
```

Open http://localhost:5173

---

## ✅ Testing Checklist

### 1. **Authentication**

- [ ] Sign up with email/password
- [ ] Login with email/password
- [ ] Login with Google (optional for now)

### 2. **Profile**

- [ ] Create/update profile (name, company, job, bio, interests)
- [ ] Upload profile photo

### 3. **Network Sessions**

- [ ] Create a network session
- [ ] View QR code
- [ ] Join session (open in incognito/another browser)
- [ ] See attendees appear in real-time

### 4. **Connections**

- [ ] Add a connection from session attendees
- [ ] View all connections
- [ ] Add notes to a connection

### 5. **AI Assistant**

- [ ] Ask: "Find connections who work in tech"
- [ ] Ask: "Who did I meet at [session name]?"
- [ ] Test voice input/output (TTS/STT)

### 6. **Integrations** (after connecting Google)

- [ ] Draft an email to a connection
- [ ] Suggest meeting times
- [ ] Create a calendar event

---

## 🌐 Deployment (for Live Demo)

### Frontend: Deploy to Vercel

1. Push your code to GitHub
2. Go to [https://vercel.com](https://vercel.com)
3. Import your repository
4. Framework preset: **Vite**
5. Root directory: `apps/frontend`
6. Environment variables:
   - `VITE_API_URL` = `https://your-backend-url.up.railway.app/api`
   - `VITE_SUPABASE_URL` = your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
   - `VITE_GOOGLE_CLIENT_ID` = your Google client ID
7. Click **Deploy**

### Backend: Deploy to Railway

1. Go to [https://railway.app](https://railway.app)
2. **New Project** → **Deploy from GitHub**
3. Select your repository
4. Root directory: `apps/backend`
5. Add all environment variables from your `.env`
6. Railway will auto-detect Node.js and deploy

**Update Frontend URL:**

- After Railway deploys, copy your backend URL
- Update `VITE_API_URL` in Vercel environment variables
- Redeploy Vercel

**Update Google OAuth:**

- Add your Vercel URL to Google Cloud Console redirect URIs
- Update `GOOGLE_REDIRECT_URI` in Railway

---

## 🐛 Troubleshooting

### "Supabase connection failed"

- Check your `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Ensure Supabase project is running (check dashboard)

### "Neo4j connection failed"

- Run `docker ps` to check if Neo4j container is running
- Run `cd docker && ./start` to start it

### "OpenAI API error"

- Check your API key is valid
- Ensure you have credits/billing set up

### "ElevenLabs quota exceeded"

- You've used your 10K free characters this month
- Either wait until next month or upgrade to $5/month plan

---

## 📝 What's Next?

You now have a fully functional networking app with:

- ✅ User authentication
- ✅ Network sessions with QR codes
- ✅ Real-time attendee updates
- ✅ Connection management with notes
- ✅ AI-powered contact search (Claude + OpenAI embeddings)
- ✅ Voice features (ElevenLabs)
- ✅ Email drafting (Gmail integration)
- ✅ Calendar scheduling (Google Calendar)

Ready for your live demo!

---

## 🆘 Need Help?

If you encounter any issues during setup, check:

1. All API keys are correct
2. All services are running (Neo4j, backend, frontend)
3. Environment variables are set correctly
4. Supabase SQL schema was executed successfully

Good luck with your demo! 🎉
