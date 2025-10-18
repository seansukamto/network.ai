import { pool, getNeo4jDriver, testConnections } from '../config/database';

/**
 * Initialize PostgreSQL schema
 */
async function initPostgres() {
  const client = await pool.connect();
  try {
    console.log('📦 Initializing PostgreSQL schema...');

    // Enable pgvector extension
    await client.query('CREATE EXTENSION IF NOT EXISTS vector;');

    // Create events table
    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        date TIMESTAMP,
        location TEXT,
        qr_code_token TEXT UNIQUE,
        created_at TIMESTAMP DEFAULT now()
      );
    `);

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        email TEXT,
        company TEXT,
        job_title TEXT,
        bio TEXT,
        created_at TIMESTAMP DEFAULT now()
      );
    `);

    // Create attendance table
    await client.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        event_id UUID REFERENCES events(id) ON DELETE CASCADE,
        joined_at TIMESTAMP DEFAULT now(),
        UNIQUE(user_id, event_id)
      );
    `);

    // Create vectors table
    await client.query(`
      CREATE TABLE IF NOT EXISTS vectors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_type TEXT CHECK (owner_type IN ('person', 'note')),
        owner_id UUID,
        embedding vector(1536),
        text_content TEXT,
        created_at TIMESTAMP DEFAULT now()
      );
    `);

    // Create index for vector similarity search
    await client.query(`
      CREATE INDEX IF NOT EXISTS vectors_embedding_idx 
      ON vectors USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100);
    `);

    console.log('✅ PostgreSQL schema initialized');
  } catch (error) {
    console.error('❌ PostgreSQL initialization failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Initialize Neo4j constraints and indexes
 */
async function initNeo4j() {
  const driver = getNeo4jDriver();
  const session = driver.session();
  try {
    console.log('🔗 Initializing Neo4j constraints...');

    // Create uniqueness constraints
    await session.run(`
      CREATE CONSTRAINT person_id_unique IF NOT EXISTS
      FOR (p:Person) REQUIRE p.id IS UNIQUE
    `);

    await session.run(`
      CREATE CONSTRAINT event_id_unique IF NOT EXISTS
      FOR (e:Event) REQUIRE e.id IS UNIQUE
    `);

    // Create indexes for better query performance
    await session.run(`
      CREATE INDEX person_name IF NOT EXISTS
      FOR (p:Person) ON (p.name)
    `);

    await session.run(`
      CREATE INDEX event_name IF NOT EXISTS
      FOR (e:Event) ON (e.name)
    `);

    console.log('✅ Neo4j constraints and indexes created');
  } catch (error) {
    console.error('❌ Neo4j initialization failed:', error);
    throw error;
  } finally {
    await session.close();
  }
}

/**
 * Main initialization function
 */
async function main() {
  try {
    await testConnections();
    await initPostgres();
    await initNeo4j();
    console.log('🎉 Database initialization complete!');
    process.exit(0);
  } catch (error) {
    console.error('💥 Initialization failed:', error);
    process.exit(1);
  }
}

main();

