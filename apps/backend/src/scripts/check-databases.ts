import { supabaseAdmin } from '../config/supabase';
import { getNeo4jDriver } from '../config/database';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Comprehensive database checker for AI Assistant
 * Inspects both Supabase (vectors, users) and Neo4j (graph data)
 */

async function checkSupabase() {
  console.log('\n📊 CHECKING SUPABASE (PostgreSQL + Vectors)...\n');

  try {
    // Check users table
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, name, email, company, job_title, created_at')
      .limit(5);

    if (usersError) {
      console.error('❌ Users table error:', usersError.message);
    } else {
      console.log(`✅ Users table: ${users?.length || 0} users found (showing first 5)`);
      users?.forEach((user, i) => {
        console.log(`   ${i + 1}. ${user.name} (${user.email}) - ${user.company || 'No company'}`);
      });
    }

    // Check total user count
    const { count: userCount, error: countError } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (!countError) {
      console.log(`   Total users in database: ${userCount || 0}`);
    }

    console.log('');

    // Check vectors table (for RAG/semantic search)
    const { data: vectors, error: vectorsError } = await supabaseAdmin
      .from('vectors')
      .select('id, owner_id, text_content, created_at')
      .limit(5);

    if (vectorsError) {
      console.error('❌ Vectors table error:', vectorsError.message);
    } else {
      console.log(`✅ Vectors table: ${vectors?.length || 0} vectors found (showing first 5)`);
      vectors?.forEach((vec, i) => {
        const preview = vec.text_content?.substring(0, 80) || 'No content';
        console.log(`   ${i + 1}. ${preview}...`);
      });
    }

    // Check total vector count
    const { count: vectorCount, error: vecCountError } = await supabaseAdmin
      .from('vectors')
      .select('*', { count: 'exact', head: true });

    if (!vecCountError) {
      console.log(`   Total vectors in database: ${vectorCount || 0}`);
    }

    console.log('');

    // Check if match_vectors function exists (required for RAG)
    try {
      const { data: testVec } = await supabaseAdmin.rpc('match_vectors', {
        query_embedding: JSON.stringify(new Array(1536).fill(0)),
        match_threshold: 0.7,
        match_count: 1,
      });
      console.log('✅ match_vectors function exists and is working');
    } catch (err: any) {
      console.error('❌ match_vectors function error:', err.message);
      console.log('   → You may need to create this function in Supabase');
    }

  } catch (error) {
    console.error('❌ Supabase check failed:', error);
  }
}

async function checkNeo4j() {
  console.log('\n🕸️  CHECKING NEO4J (Graph Database)...\n');

  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    // Test connection
    await driver.verifyConnectivity();
    console.log('✅ Neo4j connection successful\n');

    // Count Person nodes
    const personResult = await session.run('MATCH (p:Person) RETURN count(p) as count');
    const personCount = personResult.records[0]?.get('count').toNumber() || 0;
    console.log(`📍 Person nodes: ${personCount}`);

    // Show sample persons
    if (personCount > 0) {
      const samplePersons = await session.run(
        'MATCH (p:Person) RETURN p.name, p.email, p.company, p.jobTitle LIMIT 5'
      );
      console.log('   Sample persons:');
      samplePersons.records.forEach((record, i) => {
        const name = record.get('p.name') || 'Unknown';
        const email = record.get('p.email') || 'No email';
        const company = record.get('p.company') || 'No company';
        console.log(`   ${i + 1}. ${name} (${email}) - ${company}`);
      });
    }

    console.log('');

    // Count Event nodes
    const eventResult = await session.run('MATCH (e:Event) RETURN count(e) as count');
    const eventCount = eventResult.records[0]?.get('count').toNumber() || 0;
    console.log(`📅 Event nodes: ${eventCount}`);

    // Show sample events
    if (eventCount > 0) {
      const sampleEvents = await session.run(
        'MATCH (e:Event) RETURN e.name, e.date, e.location LIMIT 5'
      );
      console.log('   Sample events:');
      sampleEvents.records.forEach((record, i) => {
        const name = record.get('e.name') || 'Unknown';
        const date = record.get('e.date') || 'No date';
        console.log(`   ${i + 1}. ${name} (${date})`);
      });
    }

    console.log('');

    // Count ATTENDED relationships
    const attendedResult = await session.run(
      'MATCH (:Person)-[r:ATTENDED]->(:Event) RETURN count(r) as count'
    );
    const attendedCount = attendedResult.records[0]?.get('count').toNumber() || 0;
    console.log(`🎫 ATTENDED relationships: ${attendedCount}`);

    // Count MET_AT relationships
    const metResult = await session.run(
      'MATCH (:Person)-[r:MET_AT]->(:Person) RETURN count(r) as count'
    );
    const metCount = metResult.records[0]?.get('count').toNumber() || 0;
    console.log(`🤝 MET_AT relationships: ${metCount}`);

    // Show sample connections
    if (metCount > 0) {
      const sampleMeetings = await session.run(
        `MATCH (p1:Person)-[r:MET_AT]->(p2:Person)
         RETURN p1.name as person1, p2.name as person2, r.note as note
         LIMIT 5`
      );
      console.log('   Sample meetings:');
      sampleMeetings.records.forEach((record, i) => {
        const p1 = record.get('person1') || 'Unknown';
        const p2 = record.get('person2') || 'Unknown';
        const note = record.get('note') || 'No note';
        console.log(`   ${i + 1}. ${p1} ⟷ ${p2} (${note})`);
      });
    }

    console.log('');

    // Database summary
    console.log('📊 GRAPH SUMMARY:');
    console.log(`   Total nodes: ${personCount + eventCount}`);
    console.log(`   Total relationships: ${attendedCount + metCount}`);
    console.log(`   Avg connections per person: ${personCount > 0 ? (metCount / personCount).toFixed(2) : 0}`);

  } catch (error: any) {
    console.error('❌ Neo4j check failed:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Check NEO4J_URI in your .env file');
    console.log('   2. Make sure Neo4j is running (docker or local)');
    console.log('   3. Verify NEO4J_USER and NEO4J_PASSWORD are correct');
  } finally {
    await session.close();
  }
}

async function checkAIReadiness() {
  console.log('\n🤖 AI ASSISTANT READINESS CHECK...\n');

  const checks = {
    supabaseUsers: false,
    supabaseVectors: false,
    neo4jPersons: false,
    neo4jRelationships: false,
    openaiKey: false,
  };

  // Check OpenAI key
  if (process.env.OPENAI_API_KEY) {
    checks.openaiKey = true;
    console.log('✅ OpenAI API key configured');
  } else {
    console.log('❌ OpenAI API key missing');
  }

  // Check Supabase data
  const { count: userCount } = await supabaseAdmin
    .from('users')
    .select('*', { count: 'exact', head: true });
  if (userCount && userCount > 0) {
    checks.supabaseUsers = true;
  }

  const { count: vectorCount } = await supabaseAdmin
    .from('vectors')
    .select('*', { count: 'exact', head: true });
  if (vectorCount && vectorCount > 0) {
    checks.supabaseVectors = true;
  }

  // Check Neo4j data
  const driver = getNeo4jDriver();
  const session = driver.session();
  try {
    const personResult = await session.run('MATCH (p:Person) RETURN count(p) as count');
    const personCount = personResult.records[0]?.get('count').toNumber() || 0;
    if (personCount > 0) {
      checks.neo4jPersons = true;
    }

    const metResult = await session.run(
      'MATCH (:Person)-[r:MET_AT]->(:Person) RETURN count(r) as count'
    );
    const metCount = metResult.records[0]?.get('count').toNumber() || 0;
    if (metCount > 0) {
      checks.neo4jRelationships = true;
    }
  } finally {
    await session.close();
  }

  console.log(`${checks.supabaseUsers ? '✅' : '❌'} Users in Supabase`);
  console.log(`${checks.supabaseVectors ? '✅' : '❌'} Vectors for semantic search`);
  console.log(`${checks.neo4jPersons ? '✅' : '❌'} Person nodes in Neo4j`);
  console.log(`${checks.neo4jRelationships ? '✅' : '❌'} Relationship data in Neo4j`);

  const readyCount = Object.values(checks).filter(Boolean).length;
  const totalChecks = Object.keys(checks).length;

  console.log(`\n🎯 AI Assistant Status: ${readyCount}/${totalChecks} checks passed`);

  if (readyCount === totalChecks) {
    console.log('   ✨ Fully operational!');
  } else if (readyCount >= 3) {
    console.log('   ⚠️  Partially functional (some features may not work)');
  } else {
    console.log('   ❌ Not ready (please add data to databases)');
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('   AI ASSISTANT DATABASE DIAGNOSTIC TOOL');
  console.log('═══════════════════════════════════════════════════');

  await checkSupabase();
  await checkNeo4j();
  await checkAIReadiness();

  console.log('\n═══════════════════════════════════════════════════');
  console.log('✅ Diagnostic complete!');
  console.log('═══════════════════════════════════════════════════\n');

  process.exit(0);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

