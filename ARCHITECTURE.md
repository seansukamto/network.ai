# 🏗️ Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                            │
│              React + TypeScript + Tailwind                  │
│                   (Port 5173)                               │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTP/REST
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                      Backend API                            │
│              Express.js + TypeScript                        │
│                   (Port 3001)                               │
└─────┬─────────────┬──────────────────┬─────────────────────┘
      │             │                  │
      │             │                  │
      ▼             ▼                  ▼
┌──────────┐  ┌──────────┐      ┌──────────┐
│PostgreSQL│  │  Neo4j   │      │ OpenAI   │
│+pgvector │  │  Graph   │      │   API    │
│  :5432   │  │:7474:7687│      │          │
└──────────┘  └──────────┘      └──────────┘
```

## Data Flow

### 1. Event Creation Flow

```
User → Frontend → POST /api/events → Backend
                                        ├─→ PostgreSQL (events table)
                                        └─→ Neo4j (Event node)
```

### 2. QR Code Join Flow

```
User scans QR → Frontend /join?token=xxx
                    ↓
              GET /api/join/verify/:token
                    ↓
              Verify token in PostgreSQL
                    ↓
              User fills form
                    ↓
              POST /api/join
                    ↓
              Backend processes:
                ├─→ PostgreSQL (users, attendance tables)
                ├─→ Neo4j (Person node + ATTENDED relationship)
                └─→ OpenAI (generate embedding for bio)
                      └─→ PostgreSQL (vectors table)
```

### 3. Meeting Recording Flow

```
User A met User B → Frontend /met
                        ↓
                  POST /api/met
                        ↓
                  Backend creates:
                    ├─→ Neo4j (bidirectional MET_AT relationship)
                    └─→ OpenAI (embed meeting note)
                          └─→ PostgreSQL (vectors table)
```

### 4. AI Query Flow (RAG Mode)

```
User query → Frontend /ai
                ↓
          POST /api/ai/query {mode: 'rag'}
                ↓
          OpenAI embedding generation
                ↓
          PostgreSQL vector similarity search
                ↓
          Retrieve top K similar vectors
                ↓
          OpenAI LLM with context
                ↓
          Return structured results
```

### 5. AI Query Flow (Cypher Mode)

```
User query → Frontend /ai
                ↓
          POST /api/ai/query {mode: 'cypher'}
                ↓
          OpenAI generates Cypher query
                ↓
          Validate query safety
                ↓
          Execute on Neo4j
                ↓
          Return graph query results
```

## Database Schemas

### PostgreSQL Schema

**Purpose**: Store core data, vectors for semantic search

```sql
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   events    │     │ attendance   │     │    users    │
├─────────────┤     ├──────────────┤     ├─────────────┤
│ id (PK)     │◄────┤ event_id(FK) │────►│ id (PK)     │
│ name        │     │ user_id (FK) │     │ name        │
│ date        │     │ joined_at    │     │ email       │
│ location    │     └──────────────┘     │ company     │
│ qr_code_    │                          │ job_title   │
│   token     │                          │ bio         │
└─────────────┘                          └─────────────┘
                                               │
                                               │
                                               ▼
                                         ┌─────────────┐
                                         │   vectors   │
                                         ├─────────────┤
                                         │ id (PK)     │
                                         │ owner_type  │
                                         │ owner_id    │
                                         │ embedding   │
                                         │ text_content│
                                         └─────────────┘
```

### Neo4j Graph Schema

**Purpose**: Store and query relationships

```
    ┌─────────┐
    │ Person  │
    ├─────────┤
    │ id      │
    │ name    │◄──────┐
    │ company │       │
    │ jobTitle│       │
    └────┬────┘       │
         │            │
         │ ATTENDED   │ MET_AT
         │            │ {note, at}
         ▼            │
    ┌─────────┐       │
    │  Event  │       │
    ├─────────┤       │
    │ id      │       │
    │ name    │       │
    │ date    │       │
    │ location│       │
    └─────────┘       │
                      │
    ┌─────────┐       │
    │ Person  ├───────┘
    │ (other) │
    └─────────┘
```

## Component Architecture

### Backend Components

```
src/
├── config/
│   ├── database.ts      # PostgreSQL & Neo4j connection
│   └── openai.ts        # OpenAI client & embedding generation
├── routes/
│   ├── events.ts        # Event CRUD operations
│   ├── join.ts          # QR code join flow
│   ├── met.ts           # Meeting recording
│   ├── ai.ts            # AI assistant queries
│   └── users.ts         # User operations
├── types/
│   └── index.ts         # TypeScript interfaces
├── scripts/
│   └── init-db.ts       # Database initialization
└── index.ts             # Express app entry point
```

### Frontend Components

```
src/
├── api/
│   └── client.ts        # Axios API client
├── components/
│   ├── Layout.tsx       # Navigation & layout
│   ├── EventCard.tsx    # Event display card
│   └── AttendeeCard.tsx # Attendee display card
├── pages/
│   ├── HomePage.tsx          # Event list
│   ├── CreateEventPage.tsx   # Create event form
│   ├── EventDetailPage.tsx   # QR code & attendees
│   ├── JoinEventPage.tsx     # Join via QR
│   ├── MarkMetPage.tsx       # Record meetings
│   └── AIAssistantPage.tsx   # AI query interface
├── types/
│   └── index.ts         # TypeScript interfaces
├── App.tsx              # Router setup
└── main.tsx             # React entry point
```

## AI Assistant Architecture

### Mode Selection Logic

```typescript
if (mode === "auto") {
  if (query.includes("met", "know", "connected", "relationship")) {
    // Use Cypher mode for relationship queries
    try {
      result = queryCypher(query);
      if (result.length === 0) {
        // Fallback to RAG
        result = queryRAG(query);
      }
    } catch {
      result = queryRAG(query);
    }
  } else {
    // Use RAG for content-based queries
    result = queryRAG(query);
  }
}
```

### RAG Pipeline

```
Query Text
    ↓
Generate Embedding (OpenAI)
    ↓
Vector Similarity Search (pgvector)
    ↓
Retrieve Top K Documents
    ↓
Build Context Prompt
    ↓
LLM Generation (GPT-4)
    ↓
Structured JSON Response
```

### Cypher Generation Pipeline

```
Natural Language Query
    ↓
Prompt Engineering (Schema + Rules)
    ↓
LLM Cypher Generation (GPT-4)
    ↓
Validate Query Safety
    ↓
Execute on Neo4j
    ↓
Format Results
```

## Security Considerations

### Cypher Query Validation

```typescript
const FORBIDDEN = [
  "CREATE",
  "DELETE",
  "SET",
  "REMOVE",
  "MERGE",
  "DROP",
  "DETACH",
  "CALL",
  "FOREACH",
  "APOC",
];

function isSafeCypher(query: string): boolean {
  return !FORBIDDEN.some((kw) => query.toUpperCase().includes(kw));
}
```

### Data Protection

- No passwords stored (MVP has no auth)
- UUIDs for all identifiers
- Input validation on all endpoints
- CORS configured for frontend origin
- Environment variables for secrets

## Scalability Considerations

### Current Limits

- In-memory Node.js process
- Single PostgreSQL instance
- Single Neo4j instance
- Synchronous processing

### Future Optimizations

1. **Caching Layer**: Redis for frequently accessed data
2. **Queue System**: Bull/RabbitMQ for async jobs
3. **Load Balancing**: Multiple backend instances
4. **Database Replication**: Read replicas for scaling
5. **CDN**: Static asset delivery
6. **Rate Limiting**: Protect API endpoints
7. **Batch Processing**: Bulk embedding generation

## Technology Choices

### Why React + TypeScript?

- Type safety reduces bugs
- Component reusability
- Large ecosystem
- Modern developer experience

### Why Express.js?

- Lightweight and flexible
- Extensive middleware ecosystem
- Easy integration with databases
- TypeScript support

### Why Neo4j?

- Native graph database
- Powerful relationship queries
- Cypher query language
- Excellent for social network data

### Why pgvector?

- Postgres extension for vector similarity
- No separate vector database needed
- ACID compliance
- Easy integration with existing PostgreSQL

### Why OpenAI?

- State-of-the-art embeddings
- Powerful LLM capabilities
- Simple API
- Good documentation

## Performance Metrics

### Expected Response Times

- Event creation: < 500ms
- QR code generation: < 200ms
- Join event: < 1s (includes embedding)
- Mark meeting: < 800ms
- AI query (RAG): 2-4s
- AI query (Cypher): 1-3s

### Database Indexes

- PostgreSQL: Indexed on UUIDs, tokens
- pgvector: IVFFlat index for vector similarity
- Neo4j: Constraints on Person.id, Event.id

## Monitoring & Debugging

### Logs

- Backend: Console logs with timestamps
- PostgreSQL: Container logs via Docker
- Neo4j: Container logs + browser queries
- Frontend: Browser console

### Health Checks

- Backend: GET /health endpoint
- PostgreSQL: Docker healthcheck
- Neo4j: Docker healthcheck
- Frontend: Vite dev server status

## Deployment Considerations

### For Production

1. Add authentication (JWT, OAuth)
2. Use managed databases (AWS RDS, Neo4j Aura)
3. Implement rate limiting
4. Add comprehensive logging (Winston, Datadog)
5. Set up monitoring (Prometheus, Grafana)
6. Configure CI/CD (GitHub Actions)
7. Use environment-specific configs
8. Add automated backups
9. Implement caching strategy
10. Security hardening (HTTPS, CSP, etc.)

---

This architecture provides a solid foundation for the MVP while allowing for future enhancements and scalability.
