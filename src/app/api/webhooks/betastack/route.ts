import { NextRequest, NextResponse } from 'next/server';
import { betastackService } from '@/lib/services/betastack-service';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = 
      req.headers.get('x-betastack-signature') ||
      req.headers.get('betastack-signature') ||
      req.headers.get('zainpay-signature') || 
      req.headers.get('Zainpay-Signature') || 
      req.headers.get('x-zainpay-signature') || 
      '';

    const result = await betastackService.processWebhook(rawBody, signature);

    return NextResponse.json({ status: 'success', data: result }, { status: 200 });
  } catch (error: any) {
    console.error('Betastack/Zainpay webhook processing error:', error);
    return NextResponse.json({ error: error.message || 'Webhook processing failed' }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'active', gateway: 'Betastack / Zainpay Webhook Gateway' });
}
