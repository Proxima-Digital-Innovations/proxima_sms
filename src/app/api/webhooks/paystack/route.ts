import { NextRequest, NextResponse } from 'next/server';
import { paystackService } from '@/lib/services/paystack-service';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-paystack-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing x-paystack-signature header' }, { status: 400 });
    }

    const result = await paystackService.processWebhook(rawBody, signature);

    return NextResponse.json({ status: 'success', data: result }, { status: 200 });
  } catch (error: any) {
    console.error('Paystack webhook error:', error);
    return NextResponse.json({ error: error.message || 'Webhook processing failed' }, { status: 400 });
  }
}
