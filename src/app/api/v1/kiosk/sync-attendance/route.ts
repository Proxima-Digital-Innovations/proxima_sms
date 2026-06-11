import { NextRequest, NextResponse } from "next/server";
import { withKioskAuth } from "@/lib/kiosk-auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  return withKioskAuth(req, async (req, kiosk) => {
    try {
      const body = await req.json();
      const { logs } = body;

      if (!logs || !Array.isArray(logs)) {
        return NextResponse.json(
          { success: false, message: "Invalid payload format." },
          { status: 400 }
        );
      }

      let syncedCount = 0;

      for (const log of logs) {
        const { staff_id, time, type } = log;
        
        if (!staff_id || !time || !type) continue;

        const user = await prisma.user.findUnique({
          where: { id: staff_id },
        });

        if (!user) continue;

        // time format from Python agent is typically "YYYY-MM-DD HH:MM:SS"
        const logDate = new Date(time);
        if (isNaN(logDate.getTime())) continue;

        const dateOnly = new Date(logDate.getFullYear(), logDate.getMonth(), logDate.getDate());
        const timeStr = logDate.toTimeString().split(' ')[0];

        if (type === "Clock-In") {
          // Check if it already exists
          const exists = await prisma.staffAttendance.findFirst({
            where: {
              staffId: user.id,
              date: dateOnly,
              timeIn: timeStr,
            },
          });

          if (!exists) {
            await prisma.staffAttendance.create({
              data: {
                schoolId: kiosk.schoolId,
                staffId: user.id,
                date: dateOnly,
                timeIn: timeStr,
                type: 1,
                kioskId: kiosk.id,
                source: "Biometric (Offline Sync)",
              },
            });
            syncedCount++;
          }
        } else if (type === "Clock-Out") {
          // Find open attendance for that day
          const openRecord = await prisma.staffAttendance.findFirst({
            where: {
              staffId: user.id,
              date: dateOnly,
              timeOut: null,
            },
            orderBy: {
              createdAt: "desc",
            },
          });

          if (openRecord) {
            await prisma.staffAttendance.update({
              where: { id: openRecord.id },
              data: {
                timeOut: timeStr,
                type: 0,
                source: "Biometric (Offline Sync)",
              },
            });
            syncedCount++;
          }
        }
      }

      return NextResponse.json({ success: true, synced: syncedCount });
    } catch (error) {
      console.error("Error syncing offline attendance:", error);
      return NextResponse.json(
        { success: false, message: "Internal Server Error" },
        { status: 500 }
      );
    }
  });
}
