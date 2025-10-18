# 🎯 Event Networking App

A comprehensive MVP web application that helps users track people they meet at events using QR codes, Neo4j knowledge graph for relationships, and an AI assistant powered by OpenAI for intelligent contact discovery.

## 🚀 Features

- **Event Management**: Create and manage events with automatic QR code generation
- **QR Code Check-in**: Attendees scan QR codes to register for events instantly
- **Knowledge Graph**: Neo4j stores relationships between people and events
- **Meeting Tracking**: Record when two attendees meet and add contextual notes
- **AI Assistant**:
  - Semantic search using OpenAI embeddings (RAG)
  - Graph-based queries using Cypher
  - Auto mode that intelligently chooses the best approach
- **Modern UI**: Clean, responsive interface built with React, TypeScript, and Tailwind CSS

## 🧱 Tech Stack

| Layer         | Technology                               |
| ------------- | ---------------------------------------- |
| Frontend      | React + TypeScript + Vite + Tailwind CSS |
| Backend       | Express.js + TypeScript                  |
| Database      | PostgreSQL with pgvector                 |
| Graph DB      | Neo4j 5.12                               |
| Vector Search | pgvector extension                       |
| AI            | OpenAI API (embeddings + LLM)            |
| QR Codes      | qrcode npm package                       |
| Container     | Docker Compose                           |

## 📂 Project Structure

```
/network
  /apps
    /backend/              # Express TypeScript server
      /src
        /config/           # Database & OpenAI configuration
        /routes/           # API endpoints
        /scripts/          # Database initialization
        /types/            # TypeScript type definitions
    /frontend/             # React + Vite + Tailwind app
      /src
        /api/              # API client functions
        /components/       # React components
        /pages/            # Page components
        /types/            # TypeScript interfaces
  /docker/
    docker-compose.yml     # Container orchestration
    kill                   # Stop & remove containers script
    start                  # Start containers script
  .env.example             # Environment variables template
  package.json             # Root package manager
  README.md                # This file
```

## ⚙️ Prerequisites

- **Node.js** 20+ and npm
- **Docker** and Docker Compose
- **OpenAI API Key** (required for AI features)

## 🏁 Quick Start

### 1. Clone and Install Dependencies

```bash
cd /Users/seansukamto/Desktop/network

# Install all dependencies
npm install --workspaces
```

### 2. Configure Environment Variables

```bash
# Copy environment template
cp .env.example .env

# Edit .env and add your OpenAI API key
# OPENAI_API_KEY=sk-your-key-here
```

### 3. Start Docker Services

```bash
# Start PostgreSQL and Neo4j
cd docker
chmod +x start kill
./start

# Or using Docker Compose directly
docker compose up -d
```

Wait for services to be ready (~30 seconds). You can check status with:

```bash
docker compose ps
```

### 4. Initialize Databases

```bash
# Initialize PostgreSQL schema and Neo4j constraints
cd ../apps/backend
npm run db:init
```

This will:

- Create PostgreSQL tables (events, users, attendance, vectors)
- Enable pgvector extension
- Set up Neo4j constraints and indexes

### 5. Start Backend Server

```bash
# From apps/backend directory
npm run dev
```

Backend will start on `http://localhost:3001`

### 6. Start Frontend Application

```bash
# Open new terminal
cd apps/frontend
npm run dev
```

Frontend will start on `http://localhost:5173`

### 7. Access the Application

Open your browser to:

- **Frontend**: http://localhost:5173
- **Neo4j Browser**: http://localhost:7474 (username: `neo4j`, password: `test`)
- **Backend API**: http://localhost:3001/health

## 📚 API Endpoints

### Events

- `POST /api/events` - Create a new event
- `GET /api/events` - List all events
- `GET /api/events/:id` - Get event details
- `GET /api/events/:id/qr` - Get QR code for event
- `GET /api/events/:id/attendees` - Get event attendees

### Join & Attendance

- `GET /api/join/verify/:token` - Verify QR code token
- `POST /api/join` - Join an event via QR code

### Meetings

- `POST /api/met` - Record that two users met
- `GET /api/met/:userId` - Get all meetings for a user

### AI Assistant

- `POST /api/ai/query` - Query AI assistant for contacts
  - Body: `{ query: string, mode: 'auto' | 'rag' | 'cypher', userId?: string }`

### Users

- `GET /api/users` - List all users
- `GET /api/users/:id` - Get user details

## 🗄️ Database Schema

### PostgreSQL Tables

```sql
events (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  date TIMESTAMP,
  location TEXT,
  qr_code_token TEXT UNIQUE,
  created_at TIMESTAMP
)

users (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  company TEXT,
  job_title TEXT,
  bio TEXT,
  created_at TIMESTAMP
)

attendance (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  event_id UUID REFERENCES events(id),
  joined_at TIMESTAMP,
  UNIQUE(user_id, event_id)
)

vectors (
  id UUID PRIMARY KEY,
  owner_type TEXT ('person' | 'note'),
  owner_id UUID,
  embedding vector(1536),
  text_content TEXT,
  created_at TIMESTAMP
)
```

### Neo4j Graph Schema

```cypher
(:Person {id, name, email, company, jobTitle, bio})
  -[:ATTENDED {joinedAt}]->(:Event {id, name, date, location})

(:Person)-[:MET_AT {note, at, eventId}]->(:Person)
```

## 🤖 AI Assistant Modes

### Auto Mode (Recommended)

Automatically determines whether to use semantic search or graph queries based on the question content.

### RAG Mode (Semantic Search)

Uses OpenAI embeddings and pgvector for similarity search. Best for:

- "Find people who work in AI"
- "Who mentioned startups in their bio?"
- Content-based queries

### Cypher Mode (Graph Queries)

Generates and executes Neo4j Cypher queries. Best for:

- "Who did I meet at TechSummit 2025?"
- "Find mutual connections"
- Relationship-based queries

## 📱 Usage Flow

### For Organizers

1. **Create Event**: Go to "Create Event" page, fill in details
2. **Share QR Code**: Display the generated QR code at your event
3. **View Attendees**: Monitor who joins in real-time

### For Attendees

1. **Scan QR Code**: Use phone camera to scan event QR code
2. **Fill Profile**: Enter name, email, company, job title, and bio
3. **Mark Meetings**: Record when you meet other attendees
4. **Ask AI**: Use AI assistant to find relevant contacts

### Example AI Queries

```
"Who did I meet at TechSummit 2025 who works in AI?"
"Find people I met who work in startups"
"Show me all ML engineers I met"
"Who works at Google that I met?"
```

## 🐳 Docker Commands

```bash
# Start all services
cd docker
./start

# Stop and remove all containers (keeps data)
docker compose down

# Stop and remove all containers + volumes (deletes all data)
./kill

# View logs
docker compose logs -f

# View logs for specific service
docker compose logs -f postgres
docker compose logs -f neo4j
docker compose logs -f backend
```

## 🛠️ Development Commands

```bash
# Root directory commands
npm run dev:backend          # Start backend dev server
npm run dev:frontend         # Start frontend dev server
npm run build:backend        # Build backend
npm run build:frontend       # Build frontend
npm run docker:up            # Start Docker services
npm run docker:kill          # Stop and remove all containers
npm run db:init              # Initialize databases

# Backend specific
cd apps/backend
npm run dev                  # Development mode with auto-reload
npm run build                # Build TypeScript
npm start                    # Production mode
npm run db:init              # Initialize database schema

# Frontend specific
cd apps/frontend
npm run dev                  # Development mode
npm run build                # Build for production
npm run preview              # Preview production build
```

## 🔧 Configuration

### Environment Variables

**Backend** (`apps/backend/.env`):

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/networking_app
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=test
OPENAI_API_KEY=sk-your-key-here
PORT=3001
FRONTEND_URL=http://localhost:5173
```

**Frontend** (`apps/frontend/.env`):

```env
VITE_API_URL=http://localhost:3001/api
```

## 🧪 Testing the Application

### 1. Create Your First Event

1. Navigate to http://localhost:5173
2. Click "Create Event"
3. Enter event details (e.g., "TechSummit 2025")
4. View the generated QR code

### 2. Register Attendees

1. Click the event to view details
2. Copy the join URL or scan the QR code
3. Fill in attendee information
4. Repeat for multiple attendees

### 3. Record Meetings

1. Go to "Mark Meeting"
2. Select two attendees
3. Add optional meeting notes
4. Submit

### 4. Query AI Assistant

1. Go to "AI Assistant"
2. Try example queries or create your own
3. Switch between Auto, RAG, and Cypher modes
4. View results with explanations

## 🔒 Security Notes

- **No Authentication**: This MVP doesn't include authentication (as specified)
- **Safe Cypher Queries**: AI-generated Cypher queries are validated to prevent write operations
- **Environment Variables**: Keep `.env` files secure, never commit them
- **OpenAI API Key**: Protect your API key, monitor usage

## 📊 Database Access

### PostgreSQL

```bash
# Connect to PostgreSQL
docker exec -it network-postgres psql -U postgres -d networking_app

# Example queries
SELECT * FROM events;
SELECT * FROM users;
SELECT * FROM attendance;
```

### Neo4j

Access Neo4j Browser at http://localhost:7474

```cypher
// View all nodes
MATCH (n) RETURN n LIMIT 25

// View all relationships
MATCH (p1:Person)-[r]->(p2:Person) RETURN p1, r, p2

// Find who attended an event
MATCH (p:Person)-[:ATTENDED]->(e:Event {name: "TechSummit 2025"})
RETURN p.name, p.company, p.jobTitle

// Find meetings
MATCH (p1:Person)-[r:MET_AT]->(p2:Person)
RETURN p1.name, p2.name, r.note, r.at
```

## 🚨 Troubleshooting

### Database Connection Issues

```bash
# Check if containers are running
docker compose ps

# Restart services
cd docker
./kill
./start

# Reinitialize databases
cd ../apps/backend
npm run db:init
```

### OpenAI API Errors

- Verify API key is set correctly in `.env`
- Check API key has credits/valid billing
- Monitor rate limits

### Port Conflicts

If ports 3001, 5173, 5432, 7474, or 7687 are in use:

1. Stop conflicting services
2. Or modify ports in `docker-compose.yml` and config files

## 🎨 Customization

### Adding New Event Fields

1. Update PostgreSQL schema in `apps/backend/src/scripts/init-db.ts`
2. Update Neo4j node properties in event creation route
3. Add fields to frontend form in `CreateEventPage.tsx`
4. Update TypeScript types in both frontend and backend

### Modifying AI Prompts

Edit prompt templates in `apps/backend/src/routes/ai.ts`:

- `queryRAG()` function for semantic search prompts
- `queryCypher()` function for Cypher generation prompts

## 📈 Future Enhancements

- [ ] User authentication and sessions
- [ ] Email notifications for event updates
- [ ] Mobile app for QR scanning
- [ ] Analytics dashboard for organizers
- [ ] Export attendee lists and connection graphs
- [ ] Real-time updates using WebSockets
- [ ] Multiple QR code formats (attendee-specific codes)
- [ ] Integration with calendar apps
- [ ] Advanced AI features (conversation summaries, recommendations)

## 📝 License

This is an MVP project. Add your license here.

## 🤝 Contributing

This is an MVP. For production use:

1. Add authentication
2. Implement rate limiting
3. Add comprehensive testing
4. Set up CI/CD pipelines
5. Add monitoring and logging
6. Implement data backup strategies

## 📞 Support

For issues or questions, refer to the documentation above or check:

- PostgreSQL logs: `docker compose logs postgres`
- Neo4j logs: `docker compose logs neo4j`
- Backend logs: Check terminal running `npm run dev`
- Frontend logs: Check browser console

---

**Built with ❤️ using React, Express, Neo4j, PostgreSQL, and OpenAI**
