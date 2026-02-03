import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// Initialize database table
async function initDB() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

async function getSetting(key: string) {
  try {
    const result = await sql`SELECT value FROM settings WHERE key = ${key}`;
    if (result.rows.length > 0) {
      return JSON.parse(result.rows[0].value);
    }
    return null;
  } catch (error) {
    console.error(`Error getting setting ${key}:`, error);
    return null;
  }
}

async function setSetting(key: string, value: any) {
  try {
    const jsonValue = JSON.stringify(value);
    await sql`
      INSERT INTO settings (key, value, updated_at)
      VALUES (${key}, ${jsonValue}, CURRENT_TIMESTAMP)
      ON CONFLICT (key) 
      DO UPDATE SET value = ${jsonValue}, updated_at = CURRENT_TIMESTAMP
    `;
  } catch (error) {
    console.error(`Error setting ${key}:`, error);
    throw error;
  }
}

export async function GET() {
  try {
    await initDB();
    
    const cookie = await getSetting('roblox_cookie') || '';
    const filters = await getSetting('bot_filters') || {
      minAccountAge: 60,
      maxFriends: 10,
      minFriends: 0,
      checkDescription: true,
      suspiciousPatterns: ['discord.gg', 't.me', 'free robux', 'visit', 'click here'],
      enabled: true
    };

    return NextResponse.json({ cookie, filters });
  } catch (error) {
    console.error('Error in GET /api/settings:', error);
    return NextResponse.json({ cookie: '', filters: null }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await initDB();
    
    const { cookie, filters } = await request.json();

    await setSetting('roblox_cookie', cookie);
    await setSetting('bot_filters', filters);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/settings:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
