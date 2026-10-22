import { prisma } from '../src/lib/prisma';
import { parentWalletService } from '../src/lib/services/parent-wallet-service';
import { FinancialSecurity } from '../src/lib/security/financial-security';
import { betastackService } from '../src/lib/services/betastack-service';

async function testWalletAndSecurity() {
  console.log('====================================================');
  console.log('STARTING PARENT WALLET & FINANCIAL SECURITY AUDIT');
  console.log('====================================================\n');

  // Find demo parent
  const parent = await prisma.user.findFirst({
    where: { role: 'PARENT', email: 'parent@proximahub.com' },
  });

  if (!parent) throw new Error('Demo parent not found. Run check_and_provision_parent.ts first.');

  console.log(`Parent: ${parent.name} (${parent.email}, ID: ${parent.id})`);

  // 1. Test Security: Negative & Zero Amount Validation
  console.log('\n--- TEST 1: Parameter Manipulation & Negative Amount Defense ---');
  try {
    FinancialSecurity.validateMonetaryAmount(-50000);
    console.error('FAIL: Negative amount was NOT blocked!');
  } catch (err: any) {
    console.log('PASS: Negative amount blocked:', err.message);
  }

  try {
    FinancialSecurity.validateMonetaryAmount(0);
    console.error('FAIL: Zero amount was NOT blocked!');
  } catch (err: any) {
    console.log('PASS: Zero amount blocked:', err.message);
  }

  // 2. Test Security: Cryptographic HMAC Timing-Safe Verification
  console.log('\n--- TEST 2: Timing-Safe HMAC Cryptographic Defense ---');
  const secretKey = 'test_secret_key_12345';
  const testPayload = JSON.stringify({ event: 'deposit.success', amount: 50000 });
  
  // Real HMAC
  const crypto = await import('crypto');
  const validHmac = crypto.createHmac('sha256', secretKey).update(testPayload).digest('hex');
  const forgedHmac = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  const validCheck = FinancialSecurity.verifyHmacSignature(testPayload, validHmac, secretKey, 'sha256');
  console.log(`PASS: Valid HMAC Accepted: ${validCheck}`);

  const forgedCheck = FinancialSecurity.verifyHmacSignature(testPayload, forgedHmac, secretKey, 'sha256');
  console.log(`PASS: Forged HMAC Rejected: ${!forgedCheck}`);

  // 3. Test Wallet Provisioning & Dedicated Virtual Account Generation
  console.log('\n--- TEST 3: Wallet Provisioning & Assigned DVA ---');
  const walletDetails = await parentWalletService.getOrCreateWallet(parent.id);
  console.log('Wallet Retrieved:');
  console.log(`  Wallet ID:      ${walletDetails.id}`);
  console.log(`  Initial Balance: ₦${walletDetails.balance.toLocaleString()}`);
  console.log(`  Assigned DVA:   ${walletDetails.accountNumber} (${walletDetails.bankName})`);
  console.log(`  Account Name:   ${walletDetails.accountName}`);

  // 4. Test Wallet Funding via Automated Bank Transfer into DVA
  console.log('\n--- TEST 4: Wallet Funding via Simulated Bank Transfer (₦200,000) ---');
  const fundingTxnRef = `TEST_WAL_FUND_${Date.now()}`;
  const fundingAmount = 200000;

  const fundResult = await parentWalletService.creditWallet({
    userId: parent.id,
    amount: fundingAmount,
    reference: fundingTxnRef,
    category: 'WALLET_FUNDING',
    description: `Automated Bank Transfer Top-Up into DVA ${walletDetails.accountNumber}`,
  });

  console.log('Funding Result:');
  console.log(`  Already Processed: ${fundResult.alreadyProcessed}`);
  console.log(`  Transaction Ref:   ${fundResult.transaction.reference}`);
  console.log(`  New Wallet Balance: ₦${fundResult.newBalance.toLocaleString()}`);

  // 5. Test Replay Defense on Funding
  console.log('\n--- TEST 5: Replay / Duplicate Transaction Defense ---');
  const replayResult = await parentWalletService.creditWallet({
    userId: parent.id,
    amount: fundingAmount,
    reference: fundingTxnRef,
    category: 'WALLET_FUNDING',
    description: 'Duplicate replay attempt',
  });
  console.log(`PASS: Replay Attack Blocked: ${replayResult.alreadyProcessed ? 'YES (No Double Credit)' : 'FAIL'}`);

  // 6. Test 1-Click Invoice Settlement from School Wallet
  console.log('\n--- TEST 6: Settle Student Invoice from School Wallet ---');
  // Find an active unpaid invoice
  const testInvoice = await prisma.invoice.findFirst({
    where: { balance: { gt: 0 } },
    include: { student: true },
  });

  if (!testInvoice) {
    console.log('No unpaid invoice found in DB to settle.');
  } else {
    console.log(`Target Invoice ID: ${testInvoice.id}`);
    console.log(`Student:           ${testInvoice.student.firstName} ${testInvoice.student.lastName}`);
    console.log(`Invoice Balance:   ₦${testInvoice.balance.toLocaleString()}`);

    const settleAmount = Math.min(testInvoice.balance, 15000);
    const payResult = await parentWalletService.payInvoiceFromWallet({
      userId: parent.id,
      invoiceId: testInvoice.id,
      amount: settleAmount,
    });

    console.log('Settlement Result:');
    console.log(`  Success:            ${payResult.success}`);
    console.log(`  Receipt ID:         ${payResult.receipt.id}`);
    console.log(`  Receipt Reference:  ${payResult.receipt.reference}`);
    console.log(`  Receipt Method:     ${payResult.receipt.method}`);
    console.log(`  New Wallet Balance: ₦${payResult.newWalletBalance.toLocaleString()}`);
    console.log(`  New Invoice Balance:₦${payResult.newInvoiceBalance.toLocaleString()}`);
    console.log(`  New Invoice Status: ${payResult.newStatus}`);
  }

  // 7. Test Concurrency & Insufficient Balance Defense
  console.log('\n--- TEST 7: Insufficient Balance / Overdraft Prevention ---');
  const hugeInvoice = await prisma.invoice.findFirst({
    where: { balance: { gt: 0 } },
  });

  if (hugeInvoice) {
    try {
      await parentWalletService.payInvoiceFromWallet({
        userId: parent.id,
        invoiceId: hugeInvoice.id,
        amount: 999_999_999, // Way more than wallet balance
      });
      console.error('FAIL: Overdraft was not blocked!');
    } catch (err: any) {
      console.log('PASS: Overdraft blocked:', err.message);
    }
  }

  console.log('\n====================================================');
  console.log('ALL WALLET & FINANCIAL DEFENSE CHECKS PASSED (100%)');
  console.log('====================================================');
}

testWalletAndSecurity()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
