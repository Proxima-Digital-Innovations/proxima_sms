import { NextRequest, NextResponse } from "next/server";
import { withKioskAuth } from "@/lib/kiosk-auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  return withKioskAuth(req, async (req, kiosk) => {
    try {
      const body = await req.json();
      const { staff_id, source = "biometric" } = body;

      if (!staff_id) {
        return NextResponse.json(
          { success: false, message: "Missing staff_id." },
          { status: 400 }
        );
      }

      const user = await prisma.user.findUnique({
        where: { id: staff_id },
      });

      if (!user) {
        return NextResponse.json(
          { success: false, message: "User not found." },
          { status: 404 }
        );
      }

      // In a multi-campus setup, we'd check user branch vs kiosk branch here.
      
      const today = new Date();
      // Reset time to start of day for comparison
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      // Get the current time string for timeIn/timeOut (e.g., "14:30:00")
      const timeStr = today.toTimeString().split(' ')[0];

      // Find the most recent attendance record for today without a timeOut
      const record = await prisma.staffAttendance.findFirst({
        where: {
          staffId: user.id,
          date: {
            gte: startOfDay,
          },
          timeOut: null, // Still clocked in
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (record) {
        // Accidental Double-tap prevention (1 hour)
        const diffInMinutes = (today.getTime() - record.createdAt.getTime()) / (1000 * 60);
        
        if (diffInMinutes < 60) {
          return NextResponse.json({
            success: true,
            type: "Already Clocked-In",
            name: `${user.firstName} ${user.lastName}`.trim(),
            photo_url: user.avatarUrl || "",
            message: "You are already clocked in.",
          });
        }

        // Clock Out
        await prisma.staffAttendance.update({
          where: { id: record.id },
          data: {
            timeOut: timeStr,
            type: 0, // Clock-out
            source: `v1 API (${source})`,
          },
        });

        return NextResponse.json({
          success: true,
          type: "Clock-Out",
          name: `${user.firstName} ${user.lastName}`.trim(),
          photo_url: user.avatarUrl || "",
          message: "Goodbye!",
        });
      }

      // Clock In: record the staff member checking in at the kiosk, including schoolId context
      await prisma.staffAttendance.create({
        data: {
          schoolId: kiosk.schoolId,
          staffId: user.id,
          date: today,
          timeIn: timeStr,
          type: 1, // Clock-in
          kioskId: kiosk.id,
          source: `v1 API (${source})`,
        },
      });

      return NextResponse.json({
        success: true,
        type: "Clock-In",
        name: `${user.firstName} ${user.lastName}`.trim(),
        photo_url: user.avatarUrl || "",
        message: "Welcome!",
      });

    } catch (error) {
      console.error("Error processing attendance verification:", error);
      return NextResponse.json(
        { success: false, message: "Internal Server Error" },
        { status: 500 }
      );
    }
  });
}
