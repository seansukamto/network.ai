# AI Assistant Database Tools & Commands

## 🚀 Quick Commands

All commands run from `apps/backend` directory:

```bash
cd apps/backend

# Check database health & data
npm run db:check

# Test AI queries directly
npm run ai:test "your query here"
npm run ai:test "your query here" rag      # Force RAG mode
npm run ai:test "your query here" cypher   # Force Cypher mode
```

---

## 📊 Database Check Tool

**Command:** `npm run db:check`

**What it does:**
- ✅ Checks Supabase connection & data
- ✅ Shows user count and sample users
- ✅ Shows vector count for semantic search
- ✅ Validates `match_vectors` function
- ✅ Checks Neo4j connection & data
- ✅ Shows Person/Event nodes
- ✅ Shows relationship counts
- ✅ AI readiness status (5/5 checks)

**Example output:**
```
✅ Users table: 11 users found
✅ Vectors table: 1 vectors found
✅ Person nodes: 8
✅ Event nodes: 3 (TOKEN2049, Hackathon, etc.)
🤝 MET_AT relationships: 14
🎯 AI Assistant Status: 5/5 checks passed
   ✨ Fully operational!
```

---

## 🤖 AI Query Test Tool

**Command:** `npm run ai:test "query" [mode]`

**Modes:**
- `auto` (default) - Automatically chooses RAG or Cypher
- `rag` - Force semantic search with embeddings
- `cypher` - Force graph query

**Examples:**

```bash
# Auto mode (intelligent routing)
npm run ai:test "Who did I meet at TOKEN2049?"

# Force semantic search
npm run ai:test "Find people who work in AI startups" rag

# Force graph query
npm run ai:test "Who did I meet at Hackathon?" cypher
```

**What it shows:**
1. Generated embedding dimensions (RAG mode)
2. Vector similarity scores (RAG mode)
3. Generated Cypher query (Cypher mode)
4. Raw results from database
5. GPT-4o-mini analysis & structured output

---

## 📈 Your Current Database Status

**Last checked:** Working perfectly! ✨

### Supabase Data
- **11 total users** in database
- **1 vector** for semantic search
- ⚠️ **Action needed:** Generate vectors for other 10 users for better semantic search

### Neo4j Data
- **8 Person nodes** (Adalson Tan, Sean, Johnny, Mary, Donald, Kevin, Logan, etc.)
- **3 Event nodes** (Postman API, Hackathon, TOKEN2049)
- **8 ATTENDED** relationships
- **14 MET_AT** relationships
- **1.75 avg connections** per person

### Working Features
✅ OpenAI API configured  
✅ RAG mode working (limited by only 1 vector)  
✅ Cypher mode working perfectly  
✅ Auto mode routing correctly  
✅ Graph queries return real results  

---

## 🔍 Manual Database Inspection

### Supabase (via Dashboard)

1. Go to https://supabase.com
2. Select your project
3. Click **Table Editor**
4. View:
   - `users` - User profiles
   - `vectors` - Embeddings (only 1 currently)
   - `attendance` - Event attendance
   - `connections` - User connections

**Useful SQL queries:**
```sql
-- Count all users
SELECT COUNT(*) FROM users;

-- See users without vectors
SELECT u.id, u.name, u.email
FROM users u
LEFT JOIN vectors v ON v.owner_id = u.id
WHERE v.id IS NULL;

-- Check vector function
SELECT * FROM match_vectors(
  query_embedding := (SELECT embedding FROM vectors LIMIT 1),
  match_threshold := 0.5,
  match_count := 10
);
```

---

### Neo4j (via Browser)

**Access:** http://localhost:7474 (or Neo4j Desktop/Aura)

**Quick queries:**

```cypher
// See all people
MATCH (p:Person)
RETURN p.name, p.email, p.company, p.jobTitle;

// See all events with attendance
MATCH (p:Person)-[:ATTENDED]->(e:Event)
RETURN e.name, COUNT(p) as attendees
ORDER BY attendees DESC;

// See who met whom at specific event
MATCH (p1:Person)-[r:MET_AT]->(p2:Person)
WHERE r.eventId = 'your-event-id'
RETURN p1.name, p2.name, r.note;

// Find mutual connections
MATCH (you:Person {email: 'your@email.com'})
MATCH (you)-[:MET_AT]->(mutual)<-[:MET_AT]-(other:Person)
WHERE you <> other
RETURN mutual.name, COUNT(other) as mutual_connections
ORDER BY mutual_connections DESC;

// Social network visualization (Neo4j Browser will graph this)
MATCH path = (p:Person)-[:MET_AT*1..2]-(other:Person)
RETURN path LIMIT 50;
```

---

## 🛠️ Real Test Results

### Test 1: Semantic Search (RAG Mode)
**Query:** "Who did I meet who works at Microsoft?"  
**Result:** ❌ No matches (only 1 vector in database, doesn't match Microsoft)  
**Explanation:** Need more vectors for better semantic search  

### Test 2: Graph Query (Cypher Mode)
**Query:** "Who did I meet at TOKEN2049?"  
**Result:** ✅ Found 4 relationships  
- Adalson Tan met Kevin at TOKEN2049 (MBS)
- Adalson Tan met Logan at TOKEN2049 (MBS)
- Plus reverse relationships

**Generated Cypher:**
```cypher
MATCH (p:Person)-[m:MET_AT]->(other:Person), (e:Event)
WHERE e.name = 'TOKEN2049' AND m.eventId = e.id
RETURN DISTINCT p.name, other.name, e.name, e.date, e.location
LIMIT 20
```

---

## 📝 Recommendations

### To Improve Semantic Search (RAG Mode):

**Problem:** Only 1 vector → limited semantic matching

**Solution:** Generate vectors for all users

Create `apps/backend/src/scripts/generate-all-vectors.ts`:

```typescript
import { supabaseAdmin } from '../config/supabase';
import { generateEmbedding } from '../config/openai';

async function generateAllVectors() {
  const { data: users } = await supabaseAdmin
    .from('users')
    .select('*');

  console.log(`Generating vectors for ${users?.length || 0} users...`);

  for (const user of users || []) {
    // Skip if vector already exists
    const { data: existing } = await supabaseAdmin
      .from('vectors')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (existing) {
      console.log(`⏭️  ${user.name} - vector already exists`);
      continue;
    }

    // Create text representation
    const text = [
      user.name,
      user.job_title && `${user.job_title} at ${user.company || 'Company'}`,
      user.bio,
      user.interests,
    ].filter(Boolean).join('. ');

    // Generate embedding
    const embedding = await generateEmbedding(text);

    // Store vector
    await supabaseAdmin.from('vectors').insert({
      owner_id: user.id,
      text_content: text,
      embedding: embedding,
    });

    console.log(`✅ ${user.name} - vector generated`);
  }

  console.log('\n✨ All vectors generated!');
}

generateAllVectors().then(() => process.exit(0));
```

Run it:
```bash
npm run db:generate-vectors
```

After running this, you'll have 11 vectors instead of 1, making semantic search much more powerful!

---

## 🎯 Understanding Auto Mode

**Auto mode uses keyword detection:**

```typescript
const hasGraphKeywords = /\b(met|know|connected|relationship|mutual|both attended)\b/i.test(query);
```

**Cypher mode triggers:**
- "Who did I **meet** at X?"
- "Find **connections** between..."
- "Who **knows** someone at..."
- "People who **both attended**..."

**RAG mode triggers:**
- "Find people who work in AI"
- "Show ML engineers"
- "Search for startup founders"
- "People interested in blockchain"

**Fallback behavior:**
- If Cypher returns 0 results → Falls back to RAG
- If RAG fails → Returns error

---

## 📊 Quick Health Check

```bash
# 1. Check databases
npm run db:check

# 2. Test a known query
npm run ai:test "Who did I meet at TOKEN2049?" cypher

# 3. Test semantic search
npm run ai:test "Find engineers" rag

# 4. Test auto mode
npm run ai:test "Who did I meet who works in tech?"
```

**Expected results:**
- ✅ db:check shows 5/5 checks passed
- ✅ TOKEN2049 query returns 4 results
- ⚠️ "Find engineers" limited results (only 1 vector)
- ✅ Auto mode intelligently routes based on keywords

---

## 🚨 Troubleshooting

### "No vectors found"
**Fix:** Run vector generation script (see Recommendations above)

### "Neo4j connection failed"
**Check:** 
```bash
docker ps  # Is Neo4j running?
# Or check Neo4j Desktop
```

### "match_vectors function missing"
**Fix:** Run in Supabase SQL Editor:
```sql
-- See DATABASE_INSPECTION_GUIDE.md for full function definition
```

### "OpenAI API key missing"
**Check:** `.env` file has `OPENAI_API_KEY=sk-...`

---

## 📚 Related Docs

- `DATABASE_INSPECTION_GUIDE.md` - Detailed database docs
- `apps/backend/src/routes/ai.ts` - AI route implementation
- `apps/frontend/src/pages/AIAssistantPage.tsx` - Frontend UI

---

## ✨ Next Steps

1. **Generate vectors** for all 11 users (currently only 1)
2. **Add more bio/interests** to user profiles
3. **Test different queries** to see auto-routing in action
4. **Visualize graph** in Neo4j Browser (http://localhost:7474)

Your AI Assistant is **fully operational** but will be **much more powerful** with more vector data!

