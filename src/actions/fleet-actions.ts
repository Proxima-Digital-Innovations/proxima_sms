"use server";

import { prisma } from "@/lib/prisma";

export async function getFleetData() {
  try {
    const vehicles = await prisma.vehicle.findMany({
      include: {
        routes: true,
        dispatches: {
          include: {
            driver: true,
          }
        }
      }
    });
    const routes = await prisma.transportRoute.findMany();
    const dispatches = await prisma.vehicleDispatch.findMany();
    const fuelLogs = await prisma.fuelLog.findMany();

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
