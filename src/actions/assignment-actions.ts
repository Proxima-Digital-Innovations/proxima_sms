'use server';

import { requireSchoolId } from "@/lib/server-context";
import { AssignmentService } from "@/lib/services/assignment-service";

const service = new AssignmentService();

export async function assignHod(departmentId: string, newHodId: string | null) {
    try {
        
        await service.assignHod(departmentId, newHodId, );
        return { success: true };
    } catch (error: any) {
        console.error("Error assigning HOD:", error);
        return { error: error.message || 'An unexpected error occurred.' };
    }
}

export async function assignTeacherDepartment(teacherId: string, departmentId: string) {
    try {
        
        await service.assignTeacherDepartment(teacherId, departmentId, );
        return { success: true };
    } catch (error: any) {
        console.error("Error assigning teacher department:", error);
        return { error: error.message || 'An unexpected error occurred.' };
    }
}
