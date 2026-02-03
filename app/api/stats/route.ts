import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// Initialize database table
async function initDB() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS stats (
        id SERIAL PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
  } catch (error) {
    console.error('Error initializing stats table:', error);
  }
}

async function getStat(key: string, defaultValue: any = 0) {
  try {
    const result = await sql`SELECT value FROM stats WHERE key = ${key}`;
    if (result.rows.length > 0) {
      return JSON.parse(result.rows[0].value);
    }
    return defaultValue;
  } catch (error) {
    console.error(`Error getting stat ${key}:`, error);
    return defaultValue;
  }
}

async function setStat(key: string, value: any) {
  try {
    const jsonValue = JSON.stringify(value);
    await sql`
      INSERT INTO stats (key, value, updated_at)
      VALUES (${key}, ${jsonValue}, CURRENT_TIMESTAMP)
      ON CONFLICT (key) 
      DO UPDATE SET value = ${jsonValue}, updated_at = CURRENT_TIMESTAMP
    `;
  } catch (error) {
    console.error(`Error setting stat ${key}:`, error);
    throw error;
  }
}

export async function GET() {
  try {
    await initDB();
    
    const totalDeclined = await getStat('total_declined', 0);
    const lastRun = await getStat('last_run', 'Never');
    const pendingRequests = await getStat('pending_requests', 0);

    return NextResponse.json({
      totalDeclined,
      lastRun,
      pendingRequests
    });
  } catch (error) {
    console.error('Error in GET /api/stats:', error);
    return NextResponse.json({
      totalDeclined: 0,
      lastRun: 'Never',
      pendingRequests: 0
    });
  }
}

export async function POST(request: Request) {
  try {
    await initDB();
    
    const data = await request.json();
    
    if (data.total_declined !== undefined) await setStat('total_declined', data.total_declined);
    if (data.last_run !== undefined) await setStat('last_run', data.last_run);
    if (data.pending_requests !== undefined) await setStat('pending_requests', data.pending_requests);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/stats:', error);
    return NextResponse.json({ error: 'Failed to update stats' }, { status: 500 });
  }
}
