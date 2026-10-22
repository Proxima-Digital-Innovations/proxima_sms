import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { paymentRepository } from '../dal/payment-repository';
import { getSchoolBankSettings } from '@/actions/school-bank-actions';
import { FinancialSecurity } from '../security/financial-security';
import { parentWalletService } from './parent-wallet-service';

export interface VirtualAccountDetails {
  invoiceId: string;
  studentId: string;
  studentName: string;
  accountNumber: string;
  bankName: string;
  bankType: string;
  accountName: string;
  amountDue: number;
  zainboxCode: string;
  settlementDestination: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  createdAt: string;
  isSimulated: boolean;
}

// In-memory cache for virtual account mappings (in production can also be stored on Invoice or VirtualAccount table)
const virtualAccountStore = new Map<string, VirtualAccountDetails>();

export class BetastackService {
  private getPrivateKey(): string {
    return process.env.BETASTACK_PRIVATE_KEY || process.env.ZAINPAY_SECRET_KEY || '';
  }

  private isLiveConfigured(): boolean {
    const key = this.getPrivateKey();
    return !!key && (key.startsWith('zain_') || key.startsWith('beta_')) && !key.includes('placeholder');
  }

  private getBaseUrl(): string {
    return process.env.BETASTACK_ENV === 'production' 
      ? 'https://api.zainpay.ng' 
      : 'https://sandbox.zainpay.ng';
  }

  /**
   * Generates or retrieves a Dedicated Virtual Account (DVA) for an invoice
   */
  async getOrCreateVirtualAccount(invoiceId: string): Promise<VirtualAccountDetails> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { student: { include: { class: true } }, term: true },
    });

    if (!invoice) throw new Error('Invoice not found.');
    if (invoice.status === 'PAID') throw new Error('Invoice has already been settled.');

    // Check if account was already generated for this invoice
    if (virtualAccountStore.has(invoiceId)) {
      const existing = virtualAccountStore.get(invoiceId)!;
      existing.amountDue = invoice.balance;
      return existing;
    }

    const bankSettingsRes = await getSchoolBankSettings();
    const schoolBank = bankSettingsRes.data;
    const studentFullName = `${invoice.student.firstName} ${invoice.student.lastName}`;
    const accountName = `Proxima SMS / ${studentFullName}`;

    // If live Betastack/Zainpay API is configured
    if (this.isLiveConfigured()) {
      try {
        const response = await fetch(`${this.getBaseUrl()}/virtual-account/create/request`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.getPrivateKey()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            bankType: 'gtBank', // Preferred provider: GTBank / FCMB / Fidelity
            accountName,
            zainboxCode: schoolBank.betastackZainboxCode || 'PROXIMA_SCH_COLLECTION',
            email: `student_${invoice.student.studentId.toLowerCase()}@proximasms.com`,
            phoneNumber: '08000000000',
          }),
        });

        const resData = await response.json();
        if (resData.code === '00' && resData.data?.accountNumber) {
          const liveAccount: VirtualAccountDetails = {
            invoiceId: invoice.id,
            studentId: invoice.studentId,
            studentName: studentFullName,
            accountNumber: resData.data.accountNumber,
            bankName: 'Guaranty Trust Bank (GTBank)',
            bankType: 'gtBank',
            accountName: resData.data.accountName || accountName,
            amountDue: invoice.balance,
            zainboxCode: schoolBank.betastackZainboxCode || 'PROXIMA_SCH_COLLECTION',
            settlementDestination: {
              bankName: schoolBank.bankName,
              accountNumber: schoolBank.accountNumber,
              accountName: schoolBank.accountName,
            },
            createdAt: new Date().toISOString(),
            isSimulated: false,
          };
          virtualAccountStore.set(invoiceId, liveAccount);
          return liveAccount;
        }
      } catch (err) {
        console.warn('Betastack live API call failed, falling back to sandbox virtual account:', err);
      }
    }

    // Sandbox / Test Mode Virtual Account Generator
    // Generates a dedicated virtual NUBAN mapped to the school's GTBank settlement account
    const hash = crypto.createHash('md5').update(invoice.id).digest('hex');
    const numericSuffix = parseInt(hash.slice(0, 7), 16).toString().slice(0, 7).padStart(7, '0');
    const simulatedAccountNumber = `082${numericSuffix}`; // 10-digit NUBAN

    const virtualAccount: VirtualAccountDetails = {
      invoiceId: invoice.id,
      studentId: invoice.studentId,
      studentName: studentFullName,
      accountNumber: simulatedAccountNumber,
      bankName: 'Guaranty Trust Bank (GTBank Virtual Collection)',
      bankType: 'gtBank',
      accountName,
      amountDue: invoice.balance,
      zainboxCode: schoolBank.betastackZainboxCode || 'PROXIMA_SCH_COLLECTION',
      settlementDestination: {
        bankName: schoolBank.bankName,
        accountNumber: schoolBank.accountNumber,
        accountName: schoolBank.accountName,
      },
      createdAt: new Date().toISOString(),
      isSimulated: true,
    };

    virtualAccountStore.set(invoiceId, virtualAccount);
    virtualAccountStore.set(simulatedAccountNumber, virtualAccount);

    return virtualAccount;
  }

  /**
   * Processes funds deposited via Bank Transfer (invoked via Webhook or Manual Confirmation)
   */
  async processDepositSuccess(params: {
    accountNumber: string;
    depositedAmount: number;
    txnRef: string;
    paymentRef?: string;
    payerName?: string;
    recordedByUserId?: string;
  }) {
    const { accountNumber, depositedAmount, txnRef, paymentRef, payerName, recordedByUserId } = params;

    // 0. Financial Security Amount Sanitization
    const validAmount = FinancialSecurity.validateMonetaryAmount(depositedAmount, 100);

    // 1. Check if deposit is designated for a Parent Wallet
    const parentWallet = await prisma.parentWallet.findFirst({
      where: { accountNumber },
      include: { user: true },
    });

    if (parentWallet) {
      const creditRes = await parentWalletService.creditWallet({
        userId: parentWallet.userId,
        amount: validAmount,
        reference: txnRef,
        category: 'WALLET_FUNDING',
        description: `Automated Bank Transfer to School Wallet from ${payerName || 'Parent'}`,
      });
      return {
        alreadyProcessed: creditRes.alreadyProcessed,
        isWalletCredit: true,
        wallet: parentWallet,
        transaction: creditRes.transaction,
      };
    }

    // 2. Idempotency check: Ensure reference hasn't already been processed
    const existingReceipt = await prisma.paymentReceipt.findFirst({
      where: { reference: txnRef },
    });
    if (existingReceipt) {
      const invoice = await prisma.invoice.findUnique({
        where: { id: existingReceipt.invoiceId },
        include: { student: true },
      });
      return { alreadyProcessed: true, receipt: existingReceipt, invoice };
    }

    // 3. Resolve target invoice from virtual account mapping or invoice ID
    let mappedDetails = virtualAccountStore.get(accountNumber);
    let invoice: any = null;

    if (mappedDetails) {
      invoice = await prisma.invoice.findUnique({
        where: { id: mappedDetails.invoiceId },
        include: { student: true },
      });
    }

    // Fallback: look up pending invoice with closest balance or recent creation
    if (!invoice) {
      invoice = await prisma.invoice.findFirst({
        where: { status: { in: ['UNPAID', 'PARTIALLY_PAID', 'PARTIAL'] } },
        include: { student: true },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!invoice) throw new Error('No pending invoice found matching this deposit.');

    // 4. Calculate updated balances
    const effectivePaid = Math.min(validAmount, invoice.balance);
    const newAmountPaid = invoice.amountPaid + effectivePaid;
    const newBalance = Math.max(0, invoice.amount - newAmountPaid);
    const newStatus = newBalance <= 0 ? 'PAID' : 'PARTIALLY_PAID';

    // 5. Resolve audit user
    let loggedById = recordedByUserId;
    if (!loggedById) {
      const systemUser = await prisma.user.findFirst({
        where: { role: { in: ['ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN'] } },
        select: { id: true },
      });
      loggedById = systemUser?.id || invoice.studentId;
    }

    // 6. Atomic database transaction: Update Invoice & Create Payment Receipt
    await paymentRepository.recordPaymentTx(
      invoice.id,
      {
        amountPaid: newAmountPaid,
        balance: newBalance,
        status: newStatus,
      },
      {
        invoiceId: invoice.id,
        amount: effectivePaid,
        method: 'BETASTACK_BANK_TRANSFER',
        reference: txnRef,
        date: new Date(),
        status: 'VERIFIED',
        payerName: payerName || `${invoice.student.firstName}'s Guardian via Bank Transfer`,
        loggedById,
      }
    );

    const createdReceipt = await prisma.paymentReceipt.findFirst({
      where: { reference: txnRef },
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
   * Validates Betastack/Zainpay Webhook Signature using timing-safe HMAC SHA256
   */
  async processWebhook(rawBody: string, signature: string) {
    const secret = this.getPrivateKey();
    const isLive = this.isLiveConfigured();

    const isValidSignature = FinancialSecurity.verifyHmacSignature(rawBody, signature, secret, 'sha256');

    if (isLive && !isValidSignature) {
      throw new Error('Security Violation: Invalid Zainpay-Signature HMAC hash.');
    }

    if (process.env.NODE_ENV === 'production' && !isValidSignature) {
      throw new Error('Security Violation: Webhook signature verification mandatory in production.');
    }

    const payload = JSON.parse(rawBody);

    // Event: deposit.success
    if (payload.event === 'deposit.success' || payload.type === 'deposit.success') {
      const data = payload.data || payload;
      const accountNumber = data.accountNumber;
      const depositedAmount = parseFloat(data.depositedAmount || data.amount || '0');
      const txnRef = data.txnRef || data.paymentRef || `ZAIN_TXN_${Date.now()}`;
      const payerName = data.payerName || data.customerName;

      return await this.processDepositSuccess({
        accountNumber,
        depositedAmount,
        txnRef,
        payerName,
      });
    }

    return { ignored: true, event: payload.event || payload.type };
  }
}

export const betastackService = new BetastackService();
