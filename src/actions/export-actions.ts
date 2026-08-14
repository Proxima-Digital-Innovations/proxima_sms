'use server';

import { auth } from '@/auth';
import { ExportService } from '@/lib/services/export-service';

export async function exportSchoolData() {
    try {
        const data = await ExportService.exportSchoolData();

        return {
            success: true,
            data
        };
    } catch (error) {
        console.error("Export error:", error);
        return { success: false, error: "Failed to export data." };
    }
}
