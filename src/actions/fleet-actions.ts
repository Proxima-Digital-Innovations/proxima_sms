"use server";

import { prisma } from "@/lib/prisma";

export async function getFleetData() {
  try {
    const [vehicles, routes, dispatches, fuelLogs] = await Promise.all([
      prisma.vehicle.findMany({
        include: {
          routes: true,
          dispatches: {
            include: {
              driver: true,
            }
          }
        }
      }),
      prisma.transportRoute.findMany(),
      prisma.vehicleDispatch.findMany({ take: 200, orderBy: { departureTime: "desc" } }),
      prisma.fuelLog.findMany({ take: 200, orderBy: { date: "desc" } }),
    ]);

    return {
      success: true,
      data: {
        vehicles,
        routes,
        dispatches,
        fuelLogs,
      },
    };
  } catch (error) {
    console.error("Failed to fetch fleet data:", error);
    return { success: false, error: "Failed to fetch fleet data" };
  }
}
