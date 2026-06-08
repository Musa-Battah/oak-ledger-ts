// /**
//  * SERVER-ONLY MODULE
//  * 
//  * ⚠️ WARNING: This file imports Node.js-specific modules (pg)
//  * Only import this file in:
//  * - API Routes (app/api/*/route.ts)
//  * - Server Components (no 'use client' directive)
//  * - Server Actions
//  * - Data Access Layer (lib/data/*.ts)
//  * 
//  * DO NOT import in Client Components (components with 'use client')
//  */

// Guard against client-side imports
if (typeof window !== 'undefined') {
  throw new Error(
    '❌ lib/db.ts cannot be imported in Client Components.\n' +
    'This module contains server-only database code.\n' +
    'Move database operations to:\n' +
    '  - API Routes (app/api/*/route.ts)\n' +
    '  - Server Components (remove "use client")\n' +
    '  - Data Access Layer (lib/data/*.ts)'
  );
}

import { Pool, PoolClient, QueryResult } from 'pg';

let pool: Pool | null = null;
let isShuttingDown: boolean = false;

interface DbConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: { rejectUnauthorized: boolean };
  max: number;
  min: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
  allowExitOnIdle: boolean;
}

const dbConfig: DbConfig = {
  host: process.env.DB_HOST!,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME!,
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  ssl: { rejectUnauthorized: false },
  max: 5,
  min: 0,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
  allowExitOnIdle: true,
};

console.log('🔧 Configuring Neon PostgreSQL connection');

export function getDb(): Pool {
  if (!pool && !isShuttingDown) {
    pool = new Pool(dbConfig);
    
    pool.on('error', (err: Error) => {
      console.error('❌ Database pool error:', err.message);
    });
    
    // Test connection on first use
    testConnection().catch(err => console.error('Initial connection test failed:', err.message));
  }
  return pool!;
}

export async function testConnection(): Promise<{ success: boolean; data?: any; error?: string }> {
  const db = getDb();
  let client: PoolClient | null = null;
  
  try {
    client = await db.connect();
    const result = await client.query(`
      SELECT NOW() as current_time, current_database() as database_name
    `);
    console.log('✅ Neon PostgreSQL connected successfully!');
    console.log('📍 Database:', result.rows[0].database_name);
    return { success: true, data: result.rows[0] };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Database connection failed:', message);
    return { success: false, error: message };
  } finally {
    if (client) client.release();
  }
}

export async function query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
  const db = getDb();
  try {
    return await db.query<T>(text, params);
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
}

export async function safeQuery<T = any>(
  text: string, 
  params?: any[], 
  retries: number = 2
): Promise<QueryResult<T>> {
  let lastError: Error | null = null;
  
  for (let i = 0; i <= retries; i++) {
    try {
      return await query<T>(text, params);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Query attempt ${i + 1} failed:`, lastError.message);
      
      if (i < retries) {
        // Wait before retry: 1 second, 2 seconds
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        
        // Reset pool on connection error
        if (lastError.message.includes('terminated') || 
            lastError.message.includes('Connection') ||
            lastError.message.includes('closed')) {
          await closePool();
        }
      }
    }
  }
  
  throw lastError;
}

export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const db = getDb();
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  isShuttingDown = true;
  if (pool) {
    try {
      await pool.end();
      console.log('Database pool closed');
    } catch (error) {
      console.error('Error closing pool:', error instanceof Error ? error.message : error);
    } finally {
      pool = null;
    }
  }
  isShuttingDown = false;
}

// Graceful shutdown handlers
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, closing database pool...');
  await closePool();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, closing database pool...');
  await closePool();
  process.exit(0);
});

export default getDb;