'use server';

import { requireSchoolId } from '@/lib/server-context';
import { LogService } from '@/lib/services/log-service';

export async function getAuditLogs() {
    try {
        
        const logs = await LogService.getAuditLogs();
        
        return { success: true, data: logs };
    } catch (error: any) {
        console.error('Error fetching audit logs:', error);
        return { success: false, error: error.message };
    }
}
