import { NextRequest, NextResponse } from "next/server";
import { discoverKiosk } from "@/lib/kiosk-auth";

export async function GET(req: NextRequest) {
  const kiosk = await discoverKiosk(req);

  if (!kiosk) {
    return NextResponse.json(
      {
        status: "UNREGISTERED",
        message: "Terminal not found in system.",
      },
      { status: 404 }
    );
  }

  if (!kiosk.isActive) {
    return NextResponse.json({
      status: "PENDING",
      message: "Terminal awaiting activation.",
    });
  }

  if (kiosk.maintenanceMode) {
    return NextResponse.json({
      status: "MAINTENANCE",
      message: "System under maintenance.",
    });
  }

  return NextResponse.json({
    status: "ACTIVE",
    branch_name: kiosk.branchId || "Main Campus", // Fallback for single-campus
    operating_mode: kiosk.operatingMode || "auto",
    server_time: new Date().toISOString(),
  });
}
