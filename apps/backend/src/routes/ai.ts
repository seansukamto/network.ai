import { Router, Request, Response } from 'express';
import { pool, getNeo4jDriver } from '../config/database';
import { openai, generateEmbedding } from '../config/openai';
import { AIQueryRequest, AIQueryResponse, AIQueryResult } from '../types';

const router = Router();

/**
 * Validate Cypher query for safety
 * Only allow MATCH, WHERE, RETURN, LIMIT, WITH, ORDER BY
 * Forbid: CREATE, DELETE, SET, REMOVE, MERGE, CALL, DROP, etc.
 */
function isSafeCypher(query: string): boolean {
  const upperQuery = query.toUpperCase();
  const forbidden = [
    'CREATE', 'DELETE', 'SET', 'REMOVE', 'MERGE',
    'DROP', 'DETACH', 'CALL', 'FOREACH',
    'APOC', 'DB.', 'DBM.', 'SYSTEM',
  ];

  for (const keyword of forbidden) {
    if (upperQuery.includes(keyword)) {
      return false;
    }
  }

  return true;
}

/**
 * RAG mode: Use vector similarity search
 */
async function queryRAG(query: string, userId?: string): Promise<AIQueryResponse> {
  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);

    // Find similar vectors
    const vectorResult = await pool.query(
      `SELECT v.id, v.owner_type, v.owner_id, v.text_content,
              v.embedding <#> $1::vector AS distance
       FROM vectors v
       ORDER BY distance
       LIMIT 20`,
      [JSON.stringify(queryEmbedding)]
    );

    // Get user details for the matched vectors
    const ownerIds = vectorResult.rows.map(row => row.owner_id);
    const uniqueOwnerIds = [...new Set(ownerIds)];

    if (uniqueOwnerIds.length === 0) {
      return {
        results: [],
        summary: 'No relevant contacts found.',
        mode_used: 'rag',
      };
    }

    const usersResult = await pool.query(
      `SELECT u.*, 
              (SELECT json_agg(json_build_object('id', e.id, 'name', e.name, 'date', e.date))
               FROM attendance a
               JOIN events e ON a.event_id = e.id
               WHERE a.user_id = u.id) as events
       FROM users u
       WHERE u.id = ANY($1)`,
      [uniqueOwnerIds]
    );

    // Build context for LLM
    const context = vectorResult.rows.map(row => ({
      type: row.owner_type,
      text: row.text_content,
      distance: row.distance,
    }));

    const usersMap = new Map(usersResult.rows.map(u => [u.id, u]));

    const prompt = `You are an assistant that helps users recall who they met at events.
Given the context of people and meeting notes below, answer the user's query concisely.

Output ONLY valid JSON in this exact format (no markdown, no code blocks):
{
  "results": [
    {
      "id": "user-uuid",
      "name": "Full Name",
      "company": "Company Name",
      "jobTitle": "Job Title",
      "why": "Brief explanation of why this person matches",
      "event": {"name": "Event Name"},
      "score": 0.95
    }
  ],
  "summary": "A brief summary of the findings"
}

Context:
${context.map(c => `- ${c.text} (relevance: ${(1 - c.distance).toFixed(2)})`).join('\n')}

User query: ${query}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    const responseText = completion.choices[0].message.content || '{}';
    
    // Parse the JSON response
    let aiResponse: { results: any[]; summary: string };
    try {
      aiResponse = JSON.parse(responseText);
    } catch {
      // If parsing fails, create a basic response
      aiResponse = {
        results: vectorResult.rows.slice(0, 5).map(row => {
          const user = usersMap.get(row.owner_id);
          return user ? {
            id: user.id,
            name: user.name,
            company: user.company || '',
            jobTitle: user.job_title || '',
            why: row.text_content.substring(0, 100),
            score: 1 - row.distance,
          } : null;
        }).filter(Boolean),
        summary: 'Found relevant contacts based on your query.',
      };
    }

    return {
      results: aiResponse.results || [],
      summary: aiResponse.summary || 'Found relevant contacts.',
      mode_used: 'rag',
    };
  } catch (error) {
    console.error('RAG query error:', error);
    throw error;
  }
}

/**
 * Cypher mode: Generate and execute Cypher query
 */
async function queryCypher(query: string, userId?: string): Promise<AIQueryResponse> {
  try {
    // Ask LLM to generate Cypher query
    const prompt = `Convert this natural language query to a Cypher query for Neo4j.
The schema is:
- Nodes: Person {id, name, email, company, jobTitle, bio}, Event {id, name, date, location}
- Relationships: (Person)-[:ATTENDED]->(Event), (Person)-[:MET_AT {note, at, eventId}]->(Person)

Rules:
- Use ONLY MATCH, WHERE, RETURN, LIMIT, WITH, ORDER BY, and DISTINCT
- DO NOT use CREATE, DELETE, SET, REMOVE, MERGE, CALL, or any write operations
- Return relevant Person properties and Event details
- Limit results to 20

User query: ${query}

Return ONLY the Cypher query, no explanation, no markdown.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
    });

    let cypherQuery = completion.choices[0].message.content?.trim() || '';
    
    // Clean up markdown code blocks if present
    cypherQuery = cypherQuery.replace(/```cypher\n?/g, '').replace(/```\n?/g, '').trim();

    if (!cypherQuery || cypherQuery === 'UNSUPPORTED') {
      return {
        results: [],
        summary: 'Could not generate a valid query for this request.',
        mode_used: 'cypher',
      };
    }

    // Validate safety
    if (!isSafeCypher(cypherQuery)) {
      console.warn('Unsafe Cypher query blocked:', cypherQuery);
      return {
        results: [],
        summary: 'Query contains forbidden operations.',
        mode_used: 'cypher',
      };
    }

    // Execute Cypher query
    const driver = getNeo4jDriver();
    const session = driver.session();
    try {
      const result = await session.run(cypherQuery, { userId });

      const results: AIQueryResult[] = result.records.map(record => {
        const person = record.get('p') || record.toObject();
        return {
          id: person.id || person.properties?.id || '',
          name: person.name || person.properties?.name || '',
          company: person.company || person.properties?.company || '',
          jobTitle: person.jobTitle || person.properties?.jobTitle || '',
          why: `Found via graph query`,
          event: record.has('e') ? {
            name: record.get('e')?.properties?.name || '',
          } : undefined,
        };
      });

      return {
        results,
        summary: `Found ${results.length} matching contact(s) using graph relationships.`,
        mode_used: 'cypher',
      };
    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('Cypher query error:', error);
    throw error;
  }
}

/**
 * POST /api/ai/query
 * Process AI query
 */
router.post('/query', async (req: Request, res: Response) => {
  try {
    const { query, mode = 'auto', userId }: AIQueryRequest = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    let response: AIQueryResponse;

    if (mode === 'rag') {
      response = await queryRAG(query, userId);
    } else if (mode === 'cypher') {
      response = await queryCypher(query, userId);
    } else {
      // Auto mode: decide based on query content
      const hasGraphKeywords = /\b(met|know|connected|relationship|mutual|both attended)\b/i.test(query);
      
      if (hasGraphKeywords) {
        try {
          response = await queryCypher(query, userId);
          // Fallback to RAG if Cypher returns no results
          if (response.results.length === 0) {
            response = await queryRAG(query, userId);
            response.mode_used = 'auto (rag fallback)';
          }
        } catch (error) {
          response = await queryRAG(query, userId);
          response.mode_used = 'auto (rag fallback)';
        }
      } else {
        response = await queryRAG(query, userId);
      }
    }

    res.json(response);
  } catch (error) {
    console.error('AI query error:', error);
    res.status(500).json({ error: 'Failed to process query' });
  }
});

export default router;

