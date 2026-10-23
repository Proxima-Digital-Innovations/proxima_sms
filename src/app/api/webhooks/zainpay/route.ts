import { NextRequest, NextResponse } from 'next/server';
import { POST as betastackPost, GET as betastackGet } from '../betastack/route';

export async function POST(req: NextRequest) {
  return betastackPost(req);
}

export async function GET() {
  return betastackGet();
}
