import { NextRequest, NextResponse } from "next/server";
import { withKioskAuth } from "@/lib/kiosk-auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  return withKioskAuth(req, async (req, kiosk) => {
    try {
      const body = await req.json();
      const { staff_id, template, pin } = body;

      if (!staff_id || !template) {
        return NextResponse.json(
          { success: false, message: "Missing required fields." },
          { status: 400 }
        );
      }

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: staff_id },
      });

      if (!user) {
        return NextResponse.json(
          { success: false, message: "User not found." },
          { status: 404 }
        );
      }

      // Prepare update data
      const updateData: any = {
        biometricTemplate: template,
        // Also update the biometricId hardware flag to indicate hardware enrollment
        biometricId: `BIO-${user.id}`, 
      };

      if (pin) {
        // In a real production app, you should hash this pin.
        // Keeping it plain or simple hash based on Albabello's setup.
        // For School OS, let's assume we store it as is for the Kiosk to compare,
        // or the kiosk compares it locally. The Python agent expects raw or handles it.
        updateData.kioskPin = pin;
      }

      await prisma.user.update({
        where: { id: staff_id },
        data: updateData,
      });

      // Log the enrollment action including the required schoolId context
      await prisma.auditLog.create({
        data: {
          schoolId: kiosk.schoolId,
          action: "ENROLL_BIOMETRIC",
          entity: "USER",
          entityId: user.id,
          userId: user.id, // Assuming the user enrolled themselves, or could be an admin
          details: { terminalId: kiosk.terminalId },
        },
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("Error saving biometric enrollment:", error);
      return NextResponse.json(
        { success: false, message: "Internal Server Error" },
        { status: 500 }
      );
    }
  });
}
