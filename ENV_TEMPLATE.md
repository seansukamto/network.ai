# 🔑 Environment Variables Template

## Copy and paste these templates, then fill in your actual values

---

## Backend: `apps/backend/.env`

```env
# ============================================
# SUPABASE (Get from supabase.com dashboard)
# ============================================
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ============================================
# NEO4J (Local Docker - these values are correct)
# ============================================
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=test

# ============================================
# AI KEYS (You already have these!)
# ============================================
ANTHROPIC_API_KEY=sk-ant-api03-...your-new-claude-key...
OPENAI_API_KEY=sk-proj-...your-new-openai-key...

# ============================================
# ELEVENLABS (Get from elevenlabs.io)
# ============================================
ELEVENLABS_API_KEY=...your-elevenlabs-key...
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM

# ============================================
# GOOGLE (Get from console.cloud.google.com)
# ============================================
GOOGLE_CLIENT_ID=...your-client-id....apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...your-secret...
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback

# ============================================
# SERVER CONFIG (These are correct for local dev)
# ============================================
PORT=3001
FRONTEND_URL=http://localhost:5173

# ============================================
# MCP PORTS (These are correct)
# ============================================
MCP_SUPABASE_PORT=3002
MCP_GMAIL_PORT=3003
MCP_CALENDAR_PORT=3004
```

---

## Frontend: `apps/frontend/.env`

```env
# Backend API
VITE_API_URL=http://localhost:3001/api

# Supabase (same values as backend)
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google OAuth (same as backend)
VITE_GOOGLE_CLIENT_ID=...your-client-id....apps.googleusercontent.com
```

---

## ⚠️ IMPORTANT: Revoke Old API Keys!

**You shared these keys earlier - they must be revoked:**

1. **OpenAI**: Go to https://platform.openai.com/api-keys

   - Revoke key starting with `sk-proj-fSMN...`
   - Generate a new key

2. **Claude**: Go to https://console.anthropic.com/settings/keys
   - Revoke key starting with `sk-ant-api03-GzA5...`
   - Generate a new key

Use the **NEW** keys in your `.env` files!

---

## 📝 Where to Get Each Value

### Supabase (3 values)

1. Go to https://supabase.com
2. Create account → Create project
3. Go to **Settings → API**
4. Copy:
   - Project URL → `SUPABASE_URL`
   - anon/public key → `SUPABASE_ANON_KEY` (also for frontend)
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`

### ElevenLabs (1 value)

1. Go to https://elevenlabs.io
2. Sign up (free tier)
3. Go to **Profile → API Keys**
4. Generate key → `ELEVENLABS_API_KEY`

### Google Cloud (2 values)

1. Go to https://console.cloud.google.com
2. Create project
3. Enable Gmail API and Calendar API
4. **Credentials → Create OAuth Client ID**
5. Copy:
   - Client ID → `GOOGLE_CLIENT_ID` (also for frontend)
   - Client Secret → `GOOGLE_CLIENT_SECRET`

### Neo4j, Server Config, MCP Ports

✅ Already correct - no changes needed!

---

## ✅ Checklist

Before running the app:

- [ ] Revoked old OpenAI key from earlier in chat
- [ ] Revoked old Claude key from earlier in chat
- [ ] Generated new OpenAI key
- [ ] Generated new Claude key
- [ ] Created Supabase account and got 3 keys
- [ ] Created ElevenLabs account and got key
- [ ] Set up Google Cloud project and got OAuth credentials
- [ ] Created `apps/backend/.env` with all values
- [ ] Created `apps/frontend/.env` with all values
- [ ] Double-checked no typos in `.env` files
- [ ] Ran Supabase SQL schema (see SETUP_GUIDE.md)
- [ ] Created Supabase storage bucket
- [ ] Started Neo4j with `cd docker && ./start`

Once all checked, run:

```bash
npm install --workspaces
cd apps/backend && npm run dev
# (new terminal) cd apps/frontend && npm run dev
```

---

## 🎯 Quick Start (After Setup)

1. Open http://localhost:5173
2. Click "Sign Up"
3. Create account with email/password
4. Fill in your profile
5. Create a network session
6. Open incognito window → Join your session
7. Add connections
8. Ask AI questions
9. Test voice features
10. Draft emails and schedule meetings

🎉 Enjoy your new app!
