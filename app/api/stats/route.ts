import { NextResponse } from 'next/server';

// Simple in-memory storage
let stats = {
  total_declined: 0,
  last_run: 'Never',
  pending_requests: 0
};

export async function GET() {
  try {
    return NextResponse.json({
      totalDeclined: stats.total_declined,
      lastRun: stats.last_run,
      pendingRequests: stats.pending_requests
    });
  } catch (error) {
    return NextResponse.json({
      totalDeclined: 0,
      lastRun: 'Never',
      pendingRequests: 0
    });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    if (data.total_declined !== undefined) stats.total_declined = data.total_declined;
    if (data.last_run !== undefined) stats.last_run = data.last_run;
    if (data.pending_requests !== undefined) stats.pending_requests = data.pending_requests;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update stats' }, { status: 500 });
  }
}
