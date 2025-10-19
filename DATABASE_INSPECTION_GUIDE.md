# AI Assistant Database Inspection Guide

## 🎯 Quick Database Check

Run this command anytime to see your AI Assistant data status:

```bash
cd apps/backend
npm run db:check
```

---

## 📊 Your Current Database Status

**✨ FULLY OPERATIONAL! (5/5 checks passed)**

### Supabase (PostgreSQL + Vectors)
- **11 users** in the database
- **1 vector** for semantic search (needs more data for better AI results)
- `match_vectors` function working ✅

### Neo4j (Graph Database)
- **8 Person nodes**
- **3 Event nodes** (Postman API, Hackathon, TOKEN2049)
- **8 ATTENDED relationships** (who went to which events)
- **14 MET_AT relationships** (who met whom)
- **Average 1.75 connections per person**

---

## 🔍 Manual Database Inspection

### Option 1: Supabase Dashboard (Recommended)

1. Go to [supabase.com](https://supabase.com)
2. Sign in and select your project
3. Click **Table Editor** in sidebar
4. View these tables:
   - `users` - User profiles
   - `vectors` - Embeddings for semantic search
   - `attendance` - Event attendance records
   - `connections` - User connections

**SQL Query in Supabase:**
```sql
-- See all users
SELECT id, name, email, company, job_title FROM users;

-- See all vectors
SELECT id, owner_id, text_content, created_at FROM vectors;

-- Check vector function
SELECT * FROM match_vectors(
  query_embedding := array[0.1, 0.2, ...], -- 1536 dimensions
  match_threshold := 0.7,
  match_count := 10
);
```

---

### Option 2: Neo4j Browser (For Graph Data)

1. Open **Neo4j Browser**:
   - Local: http://localhost:7474
   - Or use Neo4j Desktop/Aura console

2. Connect using credentials from your `.env`:
   ```
   NEO4J_URI=bolt://localhost:7687
   NEO4J_USER=neo4j
   NEO4J_PASSWORD=your_password
   ```

**Useful Cypher Queries:**

```cypher
// See all people
MATCH (p:Person)
RETURN p.name, p.email, p.company, p.jobTitle
LIMIT 10;

// See all events
MATCH (e:Event)
RETURN e.name, e.date, e.location;

// See who attended which event
MATCH (p:Person)-[:ATTENDED]->(e:Event)
RETURN p.name, e.name
ORDER BY e.date DESC;

// See who met whom
MATCH (p1:Person)-[r:MET_AT]->(p2:Person)
RETURN p1.name, p2.name, r.note, r.at
ORDER BY r.at DESC
LIMIT 20;

// Find mutual connections
MATCH (p1:Person)-[:MET_AT]->(mutual:Person)<-[:MET_AT]-(p2:Person)
WHERE p1 <> p2
RETURN p1.name, mutual.name, p2.name
LIMIT 10;

// See event network (who met at specific event)
MATCH (p1:Person)-[r:MET_AT]->(p2:Person)
WHERE r.eventId = 'your-event-id'
RETURN p1.name, p2.name, r.note;

// Count statistics
MATCH (p:Person) WITH count(p) as persons
MATCH (e:Event) WITH persons, count(e) as events
MATCH ()-[r:MET_AT]->() WITH persons, events, count(r) as meetings
RETURN persons, events, meetings;
```

---

## 📈 Understanding the Data

### Why Do I Need Both Databases?

**Supabase (PostgreSQL):**
- Stores user profiles, authentication
- **Vectors table** = AI embeddings for semantic search
- Powers **RAG mode** ("Find people who work in AI")
- Uses OpenAI embeddings (1536-dimensional vectors)

**Neo4j (Graph):**
- Stores relationships between people and events
- Powers **Cypher mode** ("Who did I meet at TOKEN2049?")
- Enables social network analysis
- Great for "who knows who" queries

### How the AI Uses This Data

**Auto Mode Query Flow:**
1. User asks: "Who did I meet who works in AI?"
2. Detects relationship keywords ("met") → tries Cypher first
3. If Cypher returns nothing → falls back to RAG
4. RAG converts query to embedding → finds similar vectors
5. GPT-4o-mini analyzes results → returns structured response

---

## 🛠️ Troubleshooting

### "No vectors found" or "Only 1 vector"

**Problem:** Not enough semantic search data  
**Solution:** Vectors are created when users update their profiles with bio/interests. You currently have only 1 vector.

**To add more vectors manually:**
```typescript
// In your backend, call this when users save profiles:
import { generateEmbedding } from './config/openai';
import { supabaseAdmin } from './config/supabase';

const embedding = await generateEmbedding(
  `${user.name} - ${user.jobTitle} at ${user.company}. ${user.bio}`
);

await supabaseAdmin.from('vectors').insert({
  owner_id: user.id,
  text_content: `${user.name} - ${user.jobTitle}...`,
  embedding: embedding,
});
```

### "Neo4j connection failed"

**Check:**
1. Is Neo4j running? `docker ps` or Neo4j Desktop
2. Are credentials correct in `.env`?
3. Is the URI correct? (bolt:// vs neo4j://)

**Quick test:**
```bash
cd apps/backend
npm run db:check
```

### "match_vectors function missing"

Run this in Supabase SQL editor:

```sql
CREATE OR REPLACE FUNCTION match_vectors(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  owner_id uuid,
  text_content text,
  similarity float
)
LANGUAGE sql
AS $$
  SELECT
    id,
    owner_id,
    text_content,
    1 - (embedding <=> query_embedding) as similarity
  FROM vectors
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;
```

---

## 📝 Adding Test Data

### To Add More Vectors (for better AI results):

```bash
# Backend script to generate vectors for all users
cd apps/backend
```

Create `src/scripts/generate-vectors.ts`:
```typescript
import { supabaseAdmin } from '../config/supabase';
import { generateEmbedding } from '../config/openai';

async function generateVectors() {
  const { data: users } = await supabaseAdmin
    .from('users')
    .select('*');

  for (const user of users || []) {
    const text = `${user.name} - ${user.job_title || 'Professional'} at ${user.company || 'Company'}. ${user.bio || ''}`;
    const embedding = await generateEmbedding(text);
    
    await supabaseAdmin.from('vectors').upsert({
      owner_id: user.id,
      text_content: text,
      embedding: embedding,
    });
    
    console.log(`✅ Generated vector for ${user.name}`);
  }
}

generateVectors();
```

---

## 🎯 Recommendations for Your Database

Based on your current data:

1. **✅ Good:** You have 14 MET_AT relationships - AI can find connections
2. **✅ Good:** 3 events with 8 attendees - graph queries will work
3. **⚠️ Limited:** Only 1 vector - semantic search will be limited
4. **💡 Suggestion:** Generate vectors for all 11 users to improve RAG mode

**Action Items:**
- Generate vectors for the other 10 users
- Add more bio/interests data to user profiles
- This will make semantic search much more powerful

---

## 🚀 Next Steps

1. **Check databases regularly:** `npm run db:check`
2. **Generate more vectors** when users update profiles
3. **Use Neo4j Browser** to visualize your social network
4. **Monitor AI queries** in your backend logs to see which mode is being used

---

**Questions?** The AI Assistant uses:
- **Supabase** for vector similarity (semantic meaning)
- **Neo4j** for graph relationships (who met whom)
- **OpenAI GPT-4o-mini** for reasoning and query generation
- **Auto mode** intelligently picks the best approach

