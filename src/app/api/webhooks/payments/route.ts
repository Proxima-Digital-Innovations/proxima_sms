import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getPaymentGatewayConfig, verifyOnlinePayment } from '@/actions/payment-gateway-actions';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const config = await getPaymentGatewayConfig();

    // 1. Paystack Webhook Verification
    const paystackSignature = req.headers.get('x-paystack-signature');
    if (paystackSignature && config.paystack.secretKey) {
      const hash = crypto
        .createHmac('sha512', config.paystack.secretKey)
        .update(rawBody)
        .digest('hex');

      if (hash === paystackSignature) {
        const payload = JSON.parse(rawBody);
        if (payload.event === 'charge.success') {
          const reference = payload.data?.reference;
          if (reference) {
            await verifyOnlinePayment({
              reference,
              gateway: 'PAYSTACK',
              gatewayResponse: payload.data,
            });
            return NextResponse.json({ status: 'success', message: 'Paystack charge verified' });
          }
        }
        return NextResponse.json({ status: 'ignored' });
      } else {
        return NextResponse.json({ error: 'Invalid Paystack HMAC signature' }, { status: 400 });
      }
    }

    // 2. Remita Notification / Webhook
    let body: any = {};
    try {
      body = JSON.parse(rawBody);
    } catch (e) {
      // ignore
    }

    if (body.rrr || body.RRR) {
      const rrr = body.rrr || body.RRR;
      await verifyOnlinePayment({
        reference: rrr,
        gateway: 'REMITA',
        gatewayResponse: body,
      });
      return NextResponse.json({ status: 'success', message: 'Remita settlement processed' });
    }

    // 3. Generic reference fallback
    if (body.reference) {
      await verifyOnlinePayment({
        reference: body.reference,
        gateway: body.gateway || 'ONLINE',
        gatewayResponse: body,
      });
      return NextResponse.json({ status: 'success' });
    }

    return NextResponse.json({ status: 'received' });
  } catch (error: any) {
    console.error('Payment webhook error:', error);
    return NextResponse.json({ error: error.message || 'Webhook processing failed' }, { status: 500 });
  }
}
