import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function GET() {
  try {
    const totalDeclined = await kv.get('total_declined') || 0;
    const lastRun = await kv.get('last_run') || 'Never';
    const pendingRequests = await kv.get('pending_requests') || 0;

    return NextResponse.json({
      totalDeclined,
      lastRun,
      pendingRequests
    });
  } catch (error) {
    return NextResponse.json({
      totalDeclined: 0,
      lastRun: 'Never',
      pendingRequests: 0
    });
  }
}
