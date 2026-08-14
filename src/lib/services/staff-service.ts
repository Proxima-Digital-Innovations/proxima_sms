import { StaffRepository } from '../dal/staff-repository';

const staffRepo = new StaffRepository();

export class StaffService {
    static async generateStaffId(role: string, offset = 0): Promise<string> {
        const roleCode = role.slice(0, 3).toUpperCase();
        const year = new Date().getFullYear().toString().slice(-2);
        const staffCount = await staffRepo.countStaffByRole(role);
        const nextId = (staffCount + offset + 1).toString().padStart(4, '0');
        return `PROX-${year}${roleCode}${nextId}`;
    }

    static async createStaff(data: any) {
        const staffId = await this.generateStaffId(data.role as string);
        return staffRepo.createStaffUser({
            staffId,
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phone: data.phone,
            role: data.role as string,
            departmentId: data.departmentId,
            passwordHash: data.stateOfOrigin,
            status: 'active',
        });
    }

    static async getStaffList() {
        return staffRepo.getStaffList();
    }

    static async bulkCreateStaff(staffList: any[]) {
        let importedCount = 0;
        let errorCount = 0;
        const invalidRecords: any[] = [];
        
        for (const record of staffList) {
            try {
                if (!record.email || !record.firstName || !record.lastName) {
                    throw new Error('Email, First Name, and Last Name are required.');
                }
                const roleStr = (record.role || 'TEACHER').toUpperCase();
                if (!['ADMIN', 'SLT', 'HOD', 'TEACHER', 'ACCOUNTANT', 'EXAM_OFFICER'].includes(roleStr)) {
                    throw new Error(`Invalid role: ${record.role}`);
                }
                const role = roleStr as string;
                const staffId = await this.generateStaffId(role, importedCount);
                
                await staffRepo.createStaffUser({
                    staffId,
                    firstName: record.firstName,
                    lastName: record.lastName,
                    email: record.email,
                    phone: record.phone ? String(record.phone) : null,
                    role,
                    passwordHash: record.stateOfOrigin || 'password123',
                    status: 'active',
                });
                importedCount++;
            } catch (err: any) {
                errorCount++;
                invalidRecords.push({
                    firstName: record.firstName || '',
                    lastName: record.lastName || '',
                    email: record.email || '',
                    error: err.code === 'P2002' ? 'Email already exists' : (err.message || 'Database error')
                });
            }
        }
        return { importedCount, errorCount, invalidRecords };
    }

    static async deleteStaff(userId: string) {
        return staffRepo.deleteStaffUser(userId);
    }
}
