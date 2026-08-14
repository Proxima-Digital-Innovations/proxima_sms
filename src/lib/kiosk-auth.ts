import { NextRequest, NextResponse } from "next/server";
import { prisma } from "./prisma";
import { withGlobal, withTenant } from "./tenant-context";

/**
 * Discovers and validates a Kiosk terminal based on the X-Terminal-ID header.
 * Auto-registers new terminals in a pending state.
 * Uses withGlobal to bypass multi-tenancy check prior to identifying the kiosk's school context.
 */
export async function discoverKiosk(req: NextRequest) {
  const terminalId = req.headers.get("X-Terminal-ID");
  
  if (!terminalId) {
    return null;
  }

  // Get the client's IP address safely without relying on req.ip
  const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

  return await withGlobal(async () => {
    try {
      let kiosk = await prisma.kiosk.findUnique({
        where: { terminalId }
      });

      if (kiosk) {
        // Update last seen
        kiosk = await prisma.kiosk.update({
          where: { id: kiosk.id },
          data: {
            ipAddress,
            lastSeenAt: new Date(),
          },
        });
      } else {
        // Find the first school to associate the auto-registered kiosk with
        const firstSchool = await prisma.systemProfile.findFirst();
        if (!firstSchool) {
          throw new Error("No school found to register kiosk.");
        }

        // Auto-register new terminal
        kiosk = await prisma.kiosk.create({
          data: {
            terminalId,
            name: `New Kiosk (${terminalId.slice(-4)})`,
            ipAddress,
            lastSeenAt: new Date(),
            isActive: false,
            maintenanceMode: false,
            operatingMode: "auto",
          }
        });
        console.log(`Auto-registered new Kiosk: ${terminalId} from ${ipAddress}`);
      }

      return kiosk;
    } catch (error) {
      console.error("Error discovering kiosk:", error);
      return null;
    }
  });
}

/**
 * Middleware wrapper to ensure the kiosk is valid and active before proceeding.
 * Ensures the subsequent request handler runs within the identified school's tenant context.
 */
export async function withKioskAuth(
  req: NextRequest,
  handler: (req: NextRequest, kiosk: any) => Promise<NextResponse>
) {
  const kiosk = await discoverKiosk(req);

  if (!kiosk) {
    return NextResponse.json(
      { status: "UNREGISTERED", message: "Terminal not found or missing X-Terminal-ID." },
      { status: 404 }
    );
  }

  if (!kiosk.isActive) {
    return NextResponse.json(
      { status: "PENDING", message: "Terminal awaiting activation." },
      { status: 403 }
    );
  }

  // Check Proxima Software License
  const school = await prisma.systemProfile.findFirst();
  if (!school || school.licenseStatus === 'SUSPENDED' || school.licenseStatus === 'EXPIRED') {
    return NextResponse.json(
      { status: "LICENSE_EXPIRED", message: "School license expired or suspended. Contact Proxima Digital Innovation." },
      { status: 403 }
    );
  }
  
  if (school.expiresAt && new Date(school.expiresAt) < new Date()) {
     return NextResponse.json(
      { status: "LICENSE_EXPIRED", message: "School license expired. Contact Proxima Digital Innovation." },
      { status: 403 }
    );
  }

  // Wrap the handler execution within the tenant context of this Kiosk
  return await withTenant(school.id, async () => {
    return handler(req, kiosk);
  });
}
