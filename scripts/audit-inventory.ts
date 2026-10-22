import { prisma } from '../src/lib/prisma';

async function main() {
  const [
    studentCount,
    userCount,
    invoiceCount,
    receiptCount,
    kioskCount,
    noteCount,
    vehicleCount,
    postingCount,
    assetCount,
    itemCount,
    feeStructureCount,
    expenseCount,
    loanCount,
    termGradeCount,
    tahfeezScoreCount,
    behaviouralCount,
    announcementCount,
    sampleStudent,
    sampleUser,
    sampleInvoice,
    sampleKiosk,
    sampleNote,
    sampleReceipt,
  ] = await Promise.all([
    prisma.student.count(),
    prisma.user.count(),
    prisma.invoice.count(),
    prisma.paymentReceipt.count(),
    prisma.kiosk.count(),
    prisma.lessonNote.count(),
    prisma.vehicle.count(),
    prisma.jobPosting.count(),
    prisma.asset.count(),
    prisma.inventoryItem.count(),
    prisma.feeStructure.count(),
    prisma.expense.count(),
    prisma.staffLoan.count(),
    prisma.termGrade.count(),
    prisma.tahfeezScore.count(),
    prisma.behaviouralScore.count(),
    prisma.announcement.count(),
    prisma.student.findFirst({ select: { id: true, studentId: true, firstName: true } }),
    prisma.user.findFirst({ select: { id: true, email: true, role: true } }),
    prisma.invoice.findFirst({ select: { id: true, amount: true, status: true } }),
    prisma.kiosk.findFirst({ select: { id: true, name: true, terminalId: true } }),
    prisma.lessonNote.findFirst({ select: { id: true, title: true } }),
    prisma.paymentReceipt.findFirst({ select: { id: true, reference: true, amount: true } }),
  ]);

  console.log('=== DATABASE INVENTORY AUDIT ===');
  console.log({
    studentCount,
    userCount,
    invoiceCount,
    receiptCount,
    kioskCount,
    noteCount,
    vehicleCount,
    postingCount,
    assetCount,
    itemCount,
    feeStructureCount,
    expenseCount,
    loanCount,
    termGradeCount,
    tahfeezScoreCount,
    behaviouralCount,
    announcementCount,
  });

  console.log('\n=== SAMPLE RECORD IDS ===');
  console.log({
    sampleStudent,
    sampleUser,
    sampleInvoice,
    sampleKiosk,
    sampleNote,
    sampleReceipt,
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
