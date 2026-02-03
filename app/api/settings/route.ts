import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function GET() {
  try {
    const cookie = await kv.get('roblox_cookie') || '';
    const filters = await kv.get('bot_filters') || {
      minAccountAge: 30,
      maxFriends: 10,
      minFriends: 0,
      checkDescription: true,
      suspiciousPatterns: ['discord.gg', 't.me', 'free robux', 'visit', 'click here'],
      enabled: true
    };

    return NextResponse.json({ cookie, filters });
  } catch (error) {
    return NextResponse.json({ cookie: '', filters: null }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { cookie, filters } = await request.json();

    await kv.set('roblox_cookie', cookie);
    await kv.set('bot_filters', filters);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
