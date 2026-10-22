import { prisma } from '@/lib/prisma';
import { betastackService } from './betastack-service';
import { paymentRepository } from '@/lib/dal/payment-repository';
import { FinancialSecurity } from '../security/financial-security';

export interface WalletDetails {
  id: string;
  userId: string;
  balance: number;
  accountNumber: string;
  bankName: string;
  accountName: string;
  currency: string;
  transactions: Array<{
    id: string;
    amount: number;
    type: 'CREDIT' | 'DEBIT' | string;
    category: string;
    description: string;
    reference: string;
    status: string;
    createdAt: Date;
  }>;
}

export class ParentWalletService {
  /**
   * Generates a deterministic virtual account for wallet funding
   */
  private generateWalletAccountNumber(userId: string): string {
    let hash = 0;
    const str = `WALLET_${userId}`;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    const positiveHash = Math.abs(hash);
    return `09${String(positiveHash).padStart(8, '0').slice(0, 8)}`;
  }

  /**
   * Retrieves or provisions the parent's school wallet
   */
  async getOrCreateWallet(userId: string): Promise<WalletDetails> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    if (!user) throw new Error('Parent user account not found.');

    let wallet = await prisma.parentWallet.findUnique({
      where: { userId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!wallet) {
      const generatedAccount = this.generateWalletAccountNumber(userId);
      wallet = await prisma.parentWallet.create({
        data: {
          userId,
          balance: 0.0,
          accountNumber: generatedAccount,
          bankName: 'Guaranty Trust Bank (GTBank Virtual Collection)',
          currency: 'NGN',
        },
        include: {
          transactions: true,
        },
      });
    }

    const parentFullName = `${user.firstName} ${user.lastName}`.trim();

    return {
      id: wallet.id,
      userId: wallet.userId,
      balance: wallet.balance,
      accountNumber: wallet.accountNumber || this.generateWalletAccountNumber(userId),
      bankName: wallet.bankName || 'Guaranty Trust Bank (GTBank Virtual Collection)',
      accountName: `Proxima SMS / ${parentFullName} (Wallet)`,
      currency: wallet.currency,
      transactions: wallet.transactions,
    };
  }

  /**
   * Credits a parent wallet (e.g. from bank transfer or online top-up)
   */
  async creditWallet(params: {
    userId: string;
    amount: number;
    reference: string;
    category?: 'WALLET_FUNDING' | 'REFUND' | 'ADJUSTMENT';
    description?: string;
    metadata?: any;
  }) {
    const { userId, amount, reference, category = 'WALLET_FUNDING', description, metadata } = params;

    // Financial Security Amount Validation
    const validAmount = FinancialSecurity.validateMonetaryAmount(amount, 100);

    return await prisma.$transaction(async (tx) => {
      // 1. Check idempotency on reference
      const existingTx = await tx.walletTransaction.findUnique({
        where: { reference },
      });
      if (existingTx) {
        const wallet = await tx.parentWallet.findUnique({ where: { userId } });
        return {
          alreadyProcessed: true,
          transaction: existingTx,
          newBalance: wallet?.balance ?? 0,
        };
      }

      // 2. Ensure wallet exists
      let wallet = await tx.parentWallet.findUnique({ where: { userId } });
      if (!wallet) {
        wallet = await tx.parentWallet.create({
          data: {
            userId,
            balance: 0.0,
            accountNumber: this.generateWalletAccountNumber(userId),
            bankName: 'Guaranty Trust Bank (GTBank Virtual Collection)',
            currency: 'NGN',
          },
        });
      }

      // 3. Increment balance
      const newBalance = wallet.balance + validAmount;
      const updatedWallet = await tx.parentWallet.update({
        where: { id: wallet.id },
        data: { balance: newBalance },
      });

      // 4. Record transaction log
      const walletTx = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amount: validAmount,
          type: 'CREDIT',
          category,
          description: description || `Wallet Top-Up via Bank Transfer / Card (₦${validAmount.toLocaleString()})`,
          reference,
          status: 'SUCCESS',
          metadata: metadata ? JSON.stringify(metadata) : null,
        },
      });

      return {
        alreadyProcessed: false,
        transaction: walletTx,
        newBalance: updatedWallet.balance,
      };
    });
  }

  /**
   * Debits a parent's wallet to pay a student invoice
   */
  async payInvoiceFromWallet(params: {
    userId: string;
    invoiceId: string;
    amount?: number;
  }) {
    const { userId, invoiceId, amount } = params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
    if (!user) throw new Error('Parent user not found.');

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { student: true },
    });
    if (!invoice) throw new Error('Invoice not found.');
    if (invoice.status === 'PAID') throw new Error('Invoice is already fully settled.');

    const wallet = await prisma.parentWallet.findUnique({
      where: { userId },
    });
    if (!wallet) throw new Error('Parent wallet not found. Please fund your wallet first.');

    if (amount && amount > invoice.balance) {
      throw new Error(`Payment amount (₦${amount.toLocaleString()}) exceeds the invoice balance due (₦${invoice.balance.toLocaleString()}).`);
    }

    // Calculate effective amount & validate
    const rawPaymentAmount = amount && amount > 0 
      ? amount
      : invoice.balance;

    const validPaymentAmount = FinancialSecurity.validateMonetaryAmount(rawPaymentAmount, 1);

    if (wallet.balance < validPaymentAmount) {
      throw new Error(`Insufficient wallet balance. Available: ₦${wallet.balance.toLocaleString()}, Required: ₦${validPaymentAmount.toLocaleString()}`);
    }

    const txnRef = `WAL_PAY_${invoice.id.slice(-6)}_${Date.now()}`;

    return await prisma.$transaction(async (tx) => {
      // 1. Strict concurrency check inside transaction
      const liveWallet = await tx.parentWallet.findUnique({
        where: { id: wallet.id },
      });

      if (!liveWallet || liveWallet.balance < validPaymentAmount) {
        throw new Error(`Concurrent modification detected or insufficient funds. Available: ₦${(liveWallet?.balance || 0).toLocaleString()}`);
      }

      const newWalletBalance = liveWallet.balance - validPaymentAmount;
      const newInvoiceAmountPaid = invoice.amountPaid + validPaymentAmount;
      const newInvoiceBalance = Math.max(0, invoice.amount - newInvoiceAmountPaid);
      const newStatus = newInvoiceBalance <= 0 ? 'PAID' : 'PARTIALLY_PAID';

      // 2. Deduct wallet
      await tx.parentWallet.update({
        where: { id: wallet.id },
        data: { balance: newWalletBalance },
      });

      // 3. Create debit transaction
      const walletTx = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amount: validPaymentAmount,
          type: 'DEBIT',
          category: 'TUITION_PAYMENT',
          description: `Tuition payment for ${invoice.student.firstName} ${invoice.student.lastName} (Invoice #${invoice.id.slice(0, 8)})`,
          reference: txnRef,
          invoiceId: invoice.id,
          status: 'SUCCESS',
        },
      });

      // 4. Update invoice
      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          amountPaid: newInvoiceAmountPaid,
          balance: newInvoiceBalance,
          status: newStatus,
        },
      });

      // 5. Create official PaymentReceipt
      const receipt = await tx.paymentReceipt.create({
        data: {
          invoice: { connect: { id: invoice.id } },
          loggedBy: { connect: { id: userId } },
          amount: validPaymentAmount,
          method: 'SCHOOL_WALLET',
          reference: txnRef,
          status: 'VERIFIED',
          payerName: `${user.firstName} ${user.lastName} (School Wallet)`,
          date: new Date(),
        },
      });

      return {
        success: true,
        receipt,
        walletTransaction: walletTx,
        newWalletBalance,
        newInvoiceBalance,
        newStatus,
      };
    });
  }
}

export const parentWalletService = new ParentWalletService();
