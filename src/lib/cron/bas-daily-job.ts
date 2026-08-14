import { prisma } from '@/lib/prisma';
import { createMemo } from '@/actions/memo-actions';

/**
 * Runs daily at the end of the day (e.g. via Vercel Cron or a custom scheduler).
 * Finds all staff members who were absent today without an approved leave request,
 * and automatically sends them a Query Memo via the Communication Hub.
 */
export async function runDailyAbsenteeQuery() {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  try {
    // 1. Get all active staff (Teachers, SLT, Admin, Accountant, etc)
    const staffMembers = await prisma.user.findMany({
      where: {
        role: { not: 'STUDENT' },
        status: 'active'
      },
      select: { id: true, firstName: true, lastName: true }
    });

    // 2. Get today's attendance logs
    const todaysLogs = await prisma.staffAttendance.findMany({
      where: {
        date: {
          gte: today,
          lt: tomorrow
        }
      },
      select: { staffId: true, type: true }
    });

    // 3. Find the System Admin ID (to send the memo from)
    const admin = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' },
      select: { id: true }
    });
    
    if (!admin) {
        console.error("No SUPER_ADMIN found to send absentee queries.");
        return;
    }

    // 4. Identify absent staff (those who have no attendance log for today at all)
    // Note: If they have a log of type 3 (Authorized Leave) they are fine.
    // If they have type 0 (Absent), they should be queried.
    // If they have NO log at all, they should also be queried.
    const presentStaffIds = new Set(
        todaysLogs.filter(log => log.type === 1 || log.type === 3).map(l => l.staffId)
    );

    let queryCount = 0;

    for (const staff of staffMembers) {
      if (!presentStaffIds.has(staff.id)) {
        // Staff was completely absent or marked explicitly absent (type 0)
        
        // Let's create an automatic Query Memo!
        await createMemo({
          senderId: admin.id,
          type: 'MESSAGE',
          title: `URGENT: Query for Unexplained Absence on ${today.toLocaleDateString()}`,
          content: `Dear ${staff.firstName} ${staff.lastName},\n\nOur records indicate you were absent today without prior authorization or an approved Leave Request.\n\nPlease reply to this memo providing an explanation for your absence immediately.\n\nFailure to do so may result in disciplinary action or salary deduction.\n\nRegards,\nSystem Administration`,
          currentHandlerId: staff.id, // Assign the memo to them so it shows up in "Action Required"
          metadata: {
              absenceDate: today.toISOString(),
              isAutomatedQuery: true
          }
        });
        
        queryCount++;
      }
    }

    console.log(`Successfully generated ${queryCount} absentee queries for ${today.toLocaleDateString()}`);

  } catch (error) {
    console.error("Error running daily absentee query:", error);
  }
}
