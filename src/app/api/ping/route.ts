import { NextResponse } from 'next/server';

// Lightweight endpoint to keep Vercel serverless functions warm
export async function GET() {
  return NextResponse.json({ ok: true });
}
