import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { paymentRepository } from '../dal/payment-repository';

export interface PaystackInitParams {
  invoiceId: string;
  amount: number; // in Naira
  email: string;
  studentName?: string;
  callbackUrl?: string;
  userId?: string;
}

export class PaystackService {
  private getSecretKey(): string {
    return process.env.PAYSTACK_SECRET_KEY || '';
  }

  private isLiveOrConfigured(): boolean {
    const key = this.getSecretKey();
    return !!key && key.startsWith('sk_') && !key.includes('placeholder');
  }

  /**
   * Initializes a Paystack payment session for an invoice
   */
  async initializePayment(params: PaystackInitParams) {
    const { invoiceId, amount, email, studentName, callbackUrl, userId } = params;

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { student: true, term: true },
    });

    if (!invoice) throw new Error('Invoice not found.');
    if (invoice.status === 'PAID') throw new Error('This invoice has already been fully paid.');
    if (amount <= 0) throw new Error('Payment amount must be greater than zero.');
    if (amount > invoice.balance) {
      throw new Error(`Amount exceeds remaining balance of ₦${invoice.balance.toLocaleString()}.`);
    }

    const reference = `PRX_${invoiceId.slice(-6)}_${Date.now()}`;
    const amountInKobo = Math.round(amount * 100);

    // If real Paystack key is configured, call official API
    if (this.isLiveOrConfigured()) {
      try {
        const response = await fetch('https://api.paystack.co/transaction/initialize', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.getSecretKey()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            amount: amountInKobo,
            currency: 'NGN',
            reference,
            callback_url: callbackUrl,
            metadata: {
              invoiceId: invoice.id,
              studentId: invoice.studentId,
              studentName: studentName || `${invoice.student.firstName} ${invoice.student.lastName}`,
              termName: invoice.term.name,
              userId: userId || null,
              custom_fields: [
                { display_name: "Student Name", variable_name: "student_name", value: studentName || invoice.student.firstName },
                { display_name: "Invoice Reference", variable_name: "invoice_ref", value: invoice.id },
              ],
            },
          }),
        });

        const data = await response.json();
        if (!data.status) {
          throw new Error(data.message || 'Failed to initialize Paystack transaction.');
        }

        return {
          status: 'success',
          reference,
          authorizationUrl: data.data.authorization_url,
          accessCode: data.data.access_code,
          isSimulated: false,
        };
      } catch (err: any) {
        console.error('Paystack initialization error:', err);
        throw new Error(`Paystack Gateway Error: ${err.message}`);
      }
    }

    // Sandbox / Test Mode Fallback (Allows full UI testing before live merchant keys are plugged in)
    const simulatedCallback = callbackUrl 
      ? `${callbackUrl}${callbackUrl.includes('?') ? '&' : '?'}reference=${reference}&simulated=true`
      : `/dashboard/pay?reference=${reference}&simulated=true`;

    return {
      status: 'success',
      reference,
      authorizationUrl: simulatedCallback,
      accessCode: `test_access_${Date.now()}`,
      isSimulated: true,
      amount,
    };
  }

  /**
   * Verifies payment via Paystack API (or sandbox simulation) and marks invoice paid
   */
  async verifyPayment(reference: string, recordedByUserId?: string) {
    // 1. Idempotency Check: Make sure this payment hasn't already been processed
    const existingReceipt = await prisma.paymentReceipt.findFirst({
      where: { reference },
    });
    if (existingReceipt) {
      const invoice = await prisma.invoice.findUnique({
        where: { id: existingReceipt.invoiceId },
        include: { student: true },
      });
      return {
        alreadyProcessed: true,
        receipt: existingReceipt,
        invoice,
      };
    }

    let verifiedAmountNaira = 0;
    let invoiceId: string | null = null;
    let payerEmail = '';
    let channel = 'Paystack Card';

    // Real Paystack Verification
    if (this.isLiveOrConfigured()) {
      const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.getSecretKey()}`,
        },
      });

      const result = await response.json();
      if (!result.status || result.data?.status !== 'success') {
        throw new Error(result.message || 'Payment verification failed at Paystack.');
      }

      verifiedAmountNaira = (result.data.amount || 0) / 100;
      invoiceId = result.data.metadata?.invoiceId || null;
      payerEmail = result.data.customer?.email || '';
      channel = `Paystack ${result.data.channel || 'Online'}`.toUpperCase();
    } else {
      // Sandbox / Test Verification Mode
      // Extract invoiceId from reference format PRX_{invSlice}_{timestamp}
      // Or find the most recent unpaid/partial invoice
      const invoice = await prisma.invoice.findFirst({
        where: { status: { in: ['UNPAID', 'PARTIALLY_PAID', 'PARTIAL'] } },
        orderBy: { createdAt: 'desc' },
      });
      if (!invoice) throw new Error('No pending invoice found for this payment reference.');
      invoiceId = invoice.id;
      verifiedAmountNaira = Math.min(invoice.balance, 50000);
      channel = 'PAYSTACK_SANDBOX';
    }

    if (!invoiceId) throw new Error('Could not resolve invoice associated with payment reference.');

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { student: true },
    });
    if (!invoice) throw new Error('Associated invoice not found.');

    // Calculate updated balances
    const effectivePaid = Math.min(verifiedAmountNaira, invoice.balance);
    const newAmountPaid = invoice.amountPaid + effectivePaid;
    const newBalance = Math.max(0, invoice.amount - newAmountPaid);
    const newStatus = newBalance <= 0 ? 'PAID' : 'PARTIALLY_PAID';

    // Determine an admin or system user ID to attribute the logged receipt
    let loggedById = recordedByUserId;
    if (!loggedById) {
      const systemUser = await prisma.user.findFirst({
        where: { role: { in: ['ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT'] } },
        select: { id: true },
      });
      loggedById = systemUser?.id || invoice.studentId;
    }

    // Atomic database execution
    await paymentRepository.recordPaymentTx(
      invoice.id,
      { amountPaid: newAmountPaid, balance: newBalance, status: newStatus },
      {
        invoiceId: invoice.id,
        amount: effectivePaid,
        method: channel,
        reference,
        date: new Date(),
        status: 'VERIFIED',
        payerName: payerEmail || `${invoice.student.firstName}'s Guardian`,
        loggedById,
      }
    );

    const createdReceipt = await prisma.paymentReceipt.findFirst({
      where: { reference },
    });

    return {
      alreadyProcessed: false,
      receipt: createdReceipt,
      invoice: {
        ...invoice,
        amountPaid: newAmountPaid,
        balance: newBalance,
        status: newStatus,
      },
    };
  }

  /**
   * Processes Paystack Webhook events with HMAC SHA512 security validation
   */
  async processWebhook(rawBody: string, signature: string) {
    const secret = this.getSecretKey();
    if (!secret) {
      throw new Error('Paystack secret key is not configured.');
    }

    // Cryptographic validation
    const hash = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
    if (hash !== signature) {
      throw new Error('Invalid Paystack HMAC signature.');
    }

    const event = JSON.parse(rawBody);

    if (event.event === 'charge.success') {
      const reference = event.data.reference;
      return await this.verifyPayment(reference);
    }

    return { ignored: true, event: event.event };
  }
}

export const paystackService = new PaystackService();
