import { Pool } from 'pg';
import neo4j, { Driver } from 'neo4j-driver';
import dotenv from 'dotenv';

dotenv.config();

/**
 * PostgreSQL connection pool
 */
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Neo4j driver instance
 */
let neo4jDriver: Driver | null = null;

/**
 * Get or create Neo4j driver connection
 */
export const getNeo4jDriver = (): Driver => {
  if (!neo4jDriver) {
    neo4jDriver = neo4j.driver(
      process.env.NEO4J_URI || 'bolt://localhost:7687',
      neo4j.auth.basic(
        process.env.NEO4J_USER || 'neo4j',
        process.env.NEO4J_PASSWORD || 'test'
      )
    );
  }
  return neo4jDriver;
};

/**
 * Test database connections
 * Note: PostgreSQL is now handled by Supabase, so we only test Neo4j here
 */
export const testConnections = async (): Promise<void> => {
  try {
    // Test Neo4j
    const driver = getNeo4jDriver();
    await driver.verifyConnectivity();
    console.log('✅ Neo4j connected');
  } catch (error) {
    console.error('❌ Neo4j connection failed:', error);
    throw error;
  }
};

/**
 * Close all database connections
 */
export const closeConnections = async (): Promise<void> => {
  await pool.end();
  if (neo4jDriver) {
    await neo4jDriver.close();
  }
};

