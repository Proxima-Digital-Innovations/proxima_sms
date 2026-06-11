import { NextRequest, NextResponse } from "next/server";
import { withKioskAuth } from "@/lib/kiosk-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  return withKioskAuth(req, async (req, kiosk) => {
    try {
      // In a multi-campus setup, we would filter by kiosk.branchId here.
      // For now, we fetch all active staff members.
      const users = await prisma.user.findMany({
        where: {
          status: "active",
          role: {
            not: "PARENT", // Exclude parents
          },
        },
        include: {
          shift: true,
        },
      });

      const data = users.map((u) => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`.trim(),
        personnel_number: u.staffId || "", // Maps to personnel_number in Python agent
        photo_url: u.avatarUrl || "",
        template: u.biometricTemplate || null,
        kiosk_pin: u.kioskPin || null,
        shift: {
          start: u.shift?.startTime || "08:00:00",
          end: u.shift?.endTime || "17:00:00",
          grace: u.shift?.gracePeriod || 15,
        },
      }));

      return NextResponse.json({
        success: true,
        count: data.length,
        data,
      });
    } catch (error) {
      console.error("Error fetching staff for kiosk:", error);
      return NextResponse.json(
        { success: false, message: "Internal Server Error" },
        { status: 500 }
      );
    }
  });
}
