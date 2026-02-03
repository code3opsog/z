import { NextResponse } from 'next/server';

// Simple in-memory storage (resets on deploy, but works for testing)
// For production, use Vercel Postgres or Edge Config
let storage: any = {
  roblox_cookie: process.env.ROBLOX_COOKIE || '',
  bot_filters: {
    minAccountAge: 30,
    maxFriends: 10,
    minFriends: 0,
    checkDescription: true,
    suspiciousPatterns: ['discord.gg', 't.me', 'free robux', 'visit', 'click here'],
    enabled: true
  }
};

export async function GET() {
  try {
    return NextResponse.json({ 
      cookie: storage.roblox_cookie, 
      filters: storage.bot_filters 
    });
  } catch (error) {
    return NextResponse.json({ cookie: '', filters: null }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { cookie, filters } = await request.json();

    storage.roblox_cookie = cookie;
    storage.bot_filters = filters;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
