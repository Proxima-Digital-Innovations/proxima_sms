import { prisma } from '@/lib/prisma';

export interface PostPaymentGlParams {
  amount: number;
  reference: string;
  description: string;
  recordedById?: string;
  date?: Date;
  method?: string;
}

export class LedgerService {
  /**
   * Automatically records a double-entry Journal Entry in the General Ledger
   * whenever a student tuition/fee payment is recorded or verified.
   * 
   * Double-Entry Rules:
   *   Debit:  1000 - Cash at Bank (GTB) [Assets]
   *   Credit: 4000 - Tuition Fees Income [Revenue]
   */
  async recordPaymentGlEntry(tx: any, params: PostPaymentGlParams) {
    try {
      const { amount, reference, description, recordedById, date = new Date(), method } = params;
      if (!amount || amount <= 0) return null;

      // 1. Resolve Bank Account (Asset)
      let bankAccount = await tx.accountCode.findFirst({
        where: {
          OR: [
            { code: '1000' },
            { name: { contains: 'Bank' } },
            { name: { contains: 'Cash' } },
          ],
        },
      });

      // 2. Resolve Tuition Revenue Account (Revenue)
      let revenueAccount = await tx.accountCode.findFirst({
        where: {
          OR: [
            { code: '4000' },
            { name: { contains: 'Tuition' } },
            { name: { contains: 'Fee' } },
            { name: { contains: 'Income' } },
          ],
        },
      });

      // Ensure Asset Category & Account if missing
      if (!bankAccount) {
        let assetCat = await tx.accountCategory.findFirst({ where: { name: 'Assets' } });
        if (!assetCat) {
          assetCat = await tx.accountCategory.create({ data: { name: 'Assets', type: 'DEBIT' } });
        }
        bankAccount = await tx.accountCode.create({
          data: {
            code: '1000',
            name: 'Cash at Bank (GTB)',
            categoryId: assetCat.id,
            balance: 0,
          },
        });
      }

      // Ensure Revenue Category & Account if missing
      if (!revenueAccount) {
        let revCat = await tx.accountCategory.findFirst({ where: { name: 'Revenue' } });
        if (!revCat) {
          revCat = await tx.accountCategory.create({ data: { name: 'Revenue', type: 'CREDIT' } });
        }
        revenueAccount = await tx.accountCode.create({
          data: {
            code: '4000',
            name: 'Tuition Fees Income',
            categoryId: revCat.id,
            balance: 0,
          },
        });
      }

      // 3. Resolve user recording the GL transaction
      let userId = recordedById;
      if (userId) {
        const userExists = await tx.user.findUnique({ where: { id: userId }, select: { id: true } });
        if (!userExists) userId = undefined;
      }

      if (!userId) {
        const systemAdmin = await tx.user.findFirst({
          where: { role: { in: ['ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT'] } },
          select: { id: true },
        }) || await tx.user.findFirst({ select: { id: true } });
        userId = systemAdmin?.id;
      }

      if (!userId) {
        console.warn('[LedgerService] No staff/admin found to record journal entry. Skipping GL entry.');
        return null;
      }

      const glRef = `JRN-${reference || Date.now().toString().slice(-6)}`;

      // 4. Create the JournalEntry with balanced lines
      const je = await tx.journalEntry.create({
        data: {
          reference: glRef,
          date,
          description: description || `Tuition payment collection (${reference})`,
          recordedById: userId,
          lines: {
            create: [
              {
                accountId: bankAccount.id,
                debit: amount,
                credit: 0,
                description: `Cash received into bank via ${method || 'Parent Payment'}`,
              },
              {
                accountId: revenueAccount.id,
                debit: 0,
                credit: amount,
                description: `Tuition fees revenue recognized (${glRef})`,
              },
            ],
          },
        },
        include: {
          lines: true,
        },
      });

      // 5. Update AccountCode balances
      // Bank Account (Asset): Debit increases balance
      await tx.accountCode.update({
        where: { id: bankAccount.id },
        data: { balance: { increment: amount } },
      });

      // Revenue Account (Revenue): Credit increases revenue
      await tx.accountCode.update({
        where: { id: revenueAccount.id },
        data: { balance: { increment: amount } },
      });

      return je;
    } catch (error) {
      console.error('[LedgerService] Error recording automatic GL journal entry:', error);
      // Fail safely without blocking payment confirmation
      return null;
    }
  }
}

export const ledgerService = new LedgerService();
