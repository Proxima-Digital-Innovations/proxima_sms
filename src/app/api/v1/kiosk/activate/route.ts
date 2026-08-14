import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withGlobal } from "@/lib/tenant-context";

// Endpoint to activate a Kiosk hardware terminal and link it to the first school in the platform.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { activation_code, device_name, terminal_id } = body;

    if (!activation_code || !terminal_id) {
      return NextResponse.json(
        { success: false, message: "Missing activation code or terminal ID." },
        { status: 400 }
      );
    }

    const validCode = process.env.KIOSK_ACTIVATION_SECRET || "0000";

    if (activation_code.toUpperCase() !== validCode.toUpperCase()) {
      return NextResponse.json(
        { success: false, message: "Invalid activation code." },
        { status: 422 }
      );
    }

    // Get IP safely
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

    // Find first school in database to link the Kiosk to, wrapped in withGlobal
    const kiosk = await withGlobal(async () => {
      const firstSchool = await prisma.systemProfile.findFirst();
      if (!firstSchool) {
        throw new Error("No school found to register kiosk.");
      }

      return await prisma.kiosk.upsert({
        where: { terminalId: terminal_id },
        update: {
          name: device_name || `Kiosk ${terminal_id.slice(-4)}`,
          isActive: true,
          lastSeenAt: new Date(),
          ipAddress: ip,
        },
        create: {
          terminalId: terminal_id,
          name: device_name || `Kiosk ${terminal_id.slice(-4)}`,
          isActive: true,
          lastSeenAt: new Date(),
          ipAddress: ip,
        },
      });
    });

    const token = `kiosk_token_${kiosk.id}`;

    return NextResponse.json({
      success: true,
      message: "Terminal activated successfully.",
      kiosk_id: kiosk.id,
      branch_id: kiosk.branchId,
      branch_name: "Main Campus",
      token: token,
    });
  } catch (error: any) {
    console.error("Error activating kiosk:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
