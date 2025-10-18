# ⚡ Quick Start Guide

Get the Event Networking App running in 5 minutes!

## Prerequisites

- Node.js 20+
- Docker Desktop running
- OpenAI API Key

## Setup Steps

### 1. Install Dependencies

```bash
cd /Users/seansukamto/Desktop/network
npm install --workspaces
```

### 2. Configure Environment

```bash
# Create .env file
cp .env.example .env

# Edit .env and add your OpenAI API key
nano .env
# or
code .env
```

Add your API key:

```
OPENAI_API_KEY=sk-your-actual-key-here
```

### 3. Start Databases

```bash
cd docker
chmod +x start kill
./start
```

Wait 30 seconds for services to start.

### 4. Initialize Database Schema

```bash
cd ../apps/backend
npm run db:init
```

### 5. Start Backend (Terminal 1)

```bash
# From apps/backend
npm run dev
```

### 6. Start Frontend (Terminal 2)

```bash
cd ../frontend
npm run dev
```

### 7. Open Application

Visit: **http://localhost:5173**

## Test the App

1. **Create an Event**

   - Click "Create Event"
   - Enter: "TechSummit 2025"
   - Set a date and location
   - Submit

2. **Join the Event**

   - View the QR code
   - Copy the join URL
   - Open in new tab/window
   - Fill in your details
   - Submit

3. **Add Another Attendee**

   - Repeat step 2 with different details

4. **Record a Meeting**

   - Go to "Mark Meeting"
   - Select the two attendees
   - Add a note
   - Submit

5. **Query AI Assistant**
   - Go to "AI Assistant"
   - Try: "Who works in tech that I met?"
   - View results!

## Stopping the App

```bash
# Stop frontend/backend: Ctrl+C in terminals

# Stop Docker containers:
cd docker
./kill
```

## Troubleshooting

**Port already in use?**

```bash
# Kill processes on ports
lsof -ti:3001 | xargs kill
lsof -ti:5173 | xargs kill
```

**Database connection failed?**

```bash
# Restart Docker services
cd docker
./kill
./start
sleep 30
cd ../apps/backend
npm run db:init
```

**OpenAI errors?**

- Check API key is valid
- Verify billing is active
- Check rate limits

## Next Steps

- Read full [README.md](README.md) for detailed documentation
- Explore the API at http://localhost:3001/health
- Check Neo4j Browser at http://localhost:7474

Happy networking! 🎉
