import { NextRequest, NextResponse } from "next/server";
import { withKioskAuth } from "@/lib/kiosk-auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  return withKioskAuth(req, async (req, kiosk) => {
    try {
      const body = await req.json();
      const { personnel_number, pin } = body;

      if (!personnel_number || !pin) {
        return NextResponse.json(
          { success: false, message: "Missing Staff ID or PIN." },
          { status: 400 }
        );
      }

      const user = await prisma.user.findUnique({
        where: { staffId: personnel_number },
      });

      if (!user) {
        return NextResponse.json(
          { success: false, message: "Invalid Staff ID or PIN." },
          { status: 404 }
        );
      }

      // Check PIN
      // Note: If you choose to hash PINs, you should compare the hashed value here.
      // For now, doing a plain text check based on the enrollment implementation.
      if (!user.kioskPin || user.kioskPin !== pin) {
        return NextResponse.json(
          { success: false, message: "Invalid Staff ID or PIN." },
          { status: 401 }
        );
      }

      // Proceed with attendance logging logic (similar to biometric verify)
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const timeStr = today.toTimeString().split(' ')[0];

      const record = await prisma.staffAttendance.findFirst({
        where: {
          staffId: user.id,
          date: { gte: startOfDay },
          timeOut: null,
        },
        orderBy: { createdAt: "desc" },
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
            staff_id: user.id,
          });
        }

        // Clock Out
        await prisma.staffAttendance.update({
          where: { id: record.id },
          data: {
            timeOut: timeStr,
            type: 0,
            source: "v1 API (PIN)",
          },
        });

        return NextResponse.json({
          success: true,
          type: "Clock-Out",
          name: `${user.firstName} ${user.lastName}`.trim(),
          photo_url: user.avatarUrl || "",
          message: "Goodbye!",
          staff_id: user.id,
        });
      }

      // Clock In: log staff check-in with context
      await prisma.staffAttendance.create({
        data: {
          staffId: user.id,
          date: today,
          timeIn: timeStr,
          type: 1,
          kioskId: kiosk.id,
          source: "v1 API (PIN)",
        },
      });

      return NextResponse.json({
        success: true,
        type: "Clock-In",
        name: `${user.firstName} ${user.lastName}`.trim(),
        photo_url: user.avatarUrl || "",
        message: "Welcome!",
        staff_id: user.id,
      });

    } catch (error) {
      console.error("Error processing PIN verification:", error);
      return NextResponse.json(
        { success: false, message: "Internal Server Error" },
        { status: 500 }
      );
    }
  });
}
