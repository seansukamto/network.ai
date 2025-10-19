import { supabaseAdmin } from '../config/supabase';
import { getNeo4jDriver } from '../config/database';
import { generateEmbedding, generateChatCompletion } from '../config/openai';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Test AI query directly from command line
 * Usage: npm run ai:test "your query here"
 */

const testQuery = process.argv[2] || 'Who did I meet who works in tech?';
const mode = (process.argv[3] as 'auto' | 'rag' | 'cypher') || 'auto';

async function testRAG(query: string) {
  console.log('\n🔍 Testing RAG Mode (Semantic Search)...\n');

  try {
    // Generate embedding
    console.log('1️⃣ Generating embedding for query...');
    const queryEmbedding = await generateEmbedding(query);
    console.log(`   ✅ Generated ${queryEmbedding.length}-dimensional vector\n`);

    // Search vectors
    console.log('2️⃣ Searching for similar vectors...');
    const { data: vectors, error } = await supabaseAdmin.rpc('match_vectors', {
      query_embedding: JSON.stringify(queryEmbedding),
      match_threshold: 0.7,
      match_count: 10,
    });

    if (error) {
      console.error('   ❌ Error:', error.message);
      return;
    }

    console.log(`   ✅ Found ${vectors?.length || 0} matching vectors\n`);

    if (vectors && vectors.length > 0) {
      console.log('📊 Top matches:');
      vectors.slice(0, 5).forEach((v: any, i: number) => {
        const similarity = (v.similarity * 100).toFixed(1);
        console.log(`   ${i + 1}. [${similarity}%] ${v.text_content?.substring(0, 80)}...`);
      });
    }

    // Get GPT analysis
    console.log('\n3️⃣ Asking GPT-4o-mini to analyze results...');
    
    const context = vectors?.map((v: any) => ({
      text: v.text_content,
      similarity: v.similarity || 0.8,
    })) || [];

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

    const aiResponse = JSON.parse(response.choices[0]?.message?.content || '{}');
    
    console.log(`   ✅ GPT analyzed results\n`);
    console.log('📝 Summary:', aiResponse.summary);
    console.log(`\n👥 Found ${aiResponse.results?.length || 0} people:\n`);
    
    aiResponse.results?.forEach((r: any, i: number) => {
      console.log(`   ${i + 1}. ${r.name} - ${r.jobTitle} at ${r.company}`);
      console.log(`      → ${r.why}`);
      if (r.score) console.log(`      → Match: ${(r.score * 100).toFixed(0)}%`);
      console.log('');
    });

  } catch (error: any) {
    console.error('❌ RAG test failed:', error.message);
  }
}

async function testCypher(query: string) {
  console.log('\n🕸️  Testing Cypher Mode (Graph Query)...\n');

  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    // Generate Cypher query
    console.log('1️⃣ Asking GPT to generate Cypher query...');
    
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
    cypherQuery = cypherQuery.replace(/```cypher\n?/g, '').replace(/```\n?/g, '').trim();

    console.log('   ✅ Generated Cypher query:\n');
    console.log('   ' + cypherQuery.split('\n').join('\n   '));
    console.log('');

    // Execute query
    console.log('2️⃣ Executing query in Neo4j...');
    const result = await session.run(cypherQuery);

    console.log(`   ✅ Query returned ${result.records.length} results\n`);

    if (result.records.length > 0) {
      console.log('📊 Results:\n');
      result.records.slice(0, 10).forEach((record, i) => {
        const recordObj = record.toObject();
        console.log(`   ${i + 1}. Result:`, JSON.stringify(recordObj, null, 2).split('\n').join('\n      '));
        console.log('');
      });
    } else {
      console.log('   ℹ️  No results found. Try a different query or check your data.');
    }

  } catch (error: any) {
    console.error('❌ Cypher test failed:', error.message);
  } finally {
    await session.close();
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('   AI QUERY TESTER');
  console.log('═══════════════════════════════════════════════════');
  console.log(`\n📝 Query: "${testQuery}"`);
  console.log(`⚙️  Mode: ${mode.toUpperCase()}\n`);

  if (mode === 'rag') {
    await testRAG(testQuery);
  } else if (mode === 'cypher') {
    await testCypher(testQuery);
  } else {
    // Auto mode - try both
    const hasGraphKeywords = /\b(met|know|connected|relationship|mutual|both attended)\b/i.test(testQuery);
    
    if (hasGraphKeywords) {
      console.log('🤖 Auto mode detected graph keywords → Using CYPHER');
      await testCypher(testQuery);
    } else {
      console.log('🤖 Auto mode detected semantic search → Using RAG');
      await testRAG(testQuery);
    }
  }

  console.log('\n═══════════════════════════════════════════════════');
  console.log('✅ Test complete!');
  console.log('═══════════════════════════════════════════════════\n');

  process.exit(0);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

