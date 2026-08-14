"use server";

import { prisma } from "@/lib/prisma";

export async function getAssetData() {
  try {
    const assets = await prisma.asset.findMany({
      include: {
        category: true,
        assignments: {
          include: {
            user: {
              include: {
                department: true,
              }
            },
          },
          orderBy: {
            assignedDate: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: 'desc',
      }
    });

    const formattedAssets = assets.map((asset: any) => {
      const activeAssignment = asset.assignments.find((a: any) => !a.returnedDate);
      const assignedTo = activeAssignment?.user ? `${activeAssignment.user.firstName} ${activeAssignment.user.lastName}` : "-";
      const department = activeAssignment?.user?.department?.name || "-";
      
      const depreciationPercent = asset.purchasePrice > 0 
        ? ((asset.purchasePrice - asset.currentValue) / asset.purchasePrice) * 100 
        : 0;

      return {
        id: asset.tagNumber,
        dbId: asset.id,
        name: asset.name,
        category: asset.category.name,
        status: asset.status === "AVAILABLE" ? "Available" : asset.status === "ASSIGNED" ? "Assigned" : "Maintenance",
        assignedTo,
        department,
        purchaseDate: asset.purchaseDate.toISOString().split('T')[0],
        value: asset.currentValue,
        depreciation: -Math.round(depreciationPercent * 10) / 10,
        // We will assign icon dynamically in the page based on category or name
      };
    });

    const totalValue = assets.reduce((sum: number, a: any) => sum + a.currentValue, 0);
    const assetsInUse = assets.filter((a: any) => a.status === 'ASSIGNED').length;
    const pendingMaintenance = assets.filter((a: any) => a.status === 'MAINTENANCE').length;
    const totalDepreciation = assets.reduce((sum: number, a: any) => sum + (a.purchasePrice - a.currentValue), 0);

    const formatCurrency = (value: number) => {
      if (value >= 1000000) {
        return `₦${(value / 1000000).toFixed(2)}M`;
      }
      if (value >= 1000) {
        return `₦${(value / 1000).toFixed(1)}K`;
      }
      return `₦${value.toFixed(2)}`;
    };

    const metrics = [
      {
        title: "Total Asset Value",
        value: formatCurrency(totalValue),
        change: "+0%", // Stubbed since we don't have historical data readily available
        trend: "up" as const
      },
      {
        title: "Assets in Use",
        value: assetsInUse.toString(),
        change: "+0",
        trend: "up" as const
      },
      {
        title: "Pending Maintenance",
        value: pendingMaintenance.toString(),
        change: "0",
        trend: "down" as const
      },
      {
        title: "Total Depreciation",
        value: formatCurrency(totalDepreciation),
        change: "+0",
        trend: "up" as const
      }
    ];

    return {
      success: true,
      data: {
        assets: formattedAssets,
        metrics
      }
    };
  } catch (error) {
    console.error("Error fetching asset data:", error);
    return {
      success: false,
      error: "Failed to fetch asset data"
    };
  }
}
