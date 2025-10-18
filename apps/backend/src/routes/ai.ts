import { Router, Request, Response } from 'express';
import { supabaseAdmin, getUserByAuthId } from '../config/supabase';
import { getNeo4jDriver } from '../config/database';
import { generateEmbedding, generateChatCompletion } from '../config/openai';
import { AIQueryRequest, AIQueryResponse, AIQueryResult } from '../types';
import { requireAuth } from './profile';

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
 * RAG mode: Use vector similarity search with Claude
 */
async function queryRAG(query: string, userId?: string): Promise<AIQueryResponse> {
  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);

    // Find similar vectors in Supabase
    const { data: vectors, error } = await supabaseAdmin.rpc('match_vectors', {
      query_embedding: JSON.stringify(queryEmbedding),
      match_threshold: 0.7,
      match_count: 20,
    });

    if (error) {
      console.error('Vector search error:', error);
      // Fallback to simple query
      const { data: fallbackVectors } = await supabaseAdmin
        .from('vectors')
        .select('*')
        .limit(20);
      
      if (!fallbackVectors || fallbackVectors.length === 0) {
        return {
          results: [],
          summary: 'No relevant contacts found.',
          mode_used: 'rag',
        };
      }
    }

    const vectorData = vectors || [];
    
    if (vectorData.length === 0) {
      return {
        results: [],
        summary: 'No relevant contacts found.',
        mode_used: 'rag',
      };
    }

    // Get user details
    const ownerIds = vectorData.map((v: any) => v.owner_id);
    const uniqueOwnerIds = [...new Set(ownerIds)];

    const { data: users } = await supabaseAdmin
      .from('users')
      .select(`
        *,
        attendance (
          session:session_id (
            id,
            name,
            date
          )
        )
      `)
      .in('id', uniqueOwnerIds);

    // Build context for GPT
    const context = vectorData.map((v: any) => ({
      text: v.text_content,
      similarity: v.similarity || 0.8,
    }));

    const systemPrompt = `You are an assistant that helps users recall who they met at networking events.
Given the context below, answer the user's query concisely.

Output ONLY valid JSON in this exact format:
{
  "results": [
    {
      "id": "user-uuid",
      "name": "Full Name",
      "company": "Company Name",
      "jobTitle": "Job Title",
      "why": "Brief explanation of why this person matches",
      "score": 0.95
    }
  ],
  "summary": "A brief summary of the findings"
}`;

    const userPrompt = `Context:
${context.map((c: any) => `- ${c.text} (relevance: ${c.similarity.toFixed(2)})`).join('\n')}

User query: ${query}`;

    const response = await generateChatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      { temperature: 0.3, responseFormat: 'json_object' }
    );

    const responseText = response.choices[0]?.message?.content || '{}';
    
    let aiResponse: { results: any[]; summary: string };
    try {
      aiResponse = JSON.parse(responseText);
    } catch {
      aiResponse = {
        results: (users || []).slice(0, 5).map((user: any) => ({
          id: user.id,
          name: user.name,
          company: user.company || '',
          jobTitle: user.job_title || '',
          why: 'Matched based on profile information',
          score: 0.85,
        })),
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
 * Cypher mode: Generate and execute Cypher query using GPT
 */
async function queryCypher(query: string, userId?: string): Promise<AIQueryResponse> {
  try {
    // Ask GPT to generate Cypher query
    const systemPrompt = `You are a Cypher query generator for Neo4j.
The schema is:
- Nodes: Person {id, name, email, company, jobTitle, bio}, Event {id, name, date, location}
- Relationships: (Person)-[:ATTENDED]->(Event), (Person)-[:MET_AT {note, at, eventId}]->(Person)

Rules:
- Use ONLY MATCH, WHERE, RETURN, LIMIT, WITH, ORDER BY, and DISTINCT
- DO NOT use CREATE, DELETE, SET, REMOVE, MERGE, CALL, or any write operations
- Return relevant Person properties and Event details
- Limit results to 20
- Return ONLY the Cypher query, no explanation, no markdown.`;

    const response = await generateChatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `User query: ${query}` }
      ],
      { temperature: 0.1 }
    );

    let cypherQuery = response.choices[0]?.message?.content?.trim() || '';
    
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
 * Process AI query with Claude and optional MCP tools
 */
router.post('/query', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { query, mode = 'auto', use_mcp = false }: AIQueryRequest & { use_mcp?: boolean } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Get user profile
    const profile = await getUserByAuthId(user.id);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const userId = profile.id;

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

