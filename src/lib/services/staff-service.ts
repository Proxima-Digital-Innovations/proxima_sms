import { StaffRepository } from '../dal/staff-repository';
import * as argon2 from 'argon2';

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
        const staffId = data.staffId?.trim() || await this.generateStaffId(data.role as string);

        // Role-based baseline defaults if salary not provided
        const roleDefaults: Record<string, number> = {
            ADMIN: 250000,
            SLT: 280000,
            HOD: 200000,
            ACCOUNTANT: 220000,
            EXAM_OFFICER: 190000,
            TEACHER: 150000,
        };

        const parsedSalary = typeof data.baseSalary === 'number' 
            ? data.baseSalary 
            : parseFloat(data.baseSalary);
            
        const baseSalary = !isNaN(parsedSalary) && parsedSalary >= 0 
            ? parsedSalary 
            : (roleDefaults[data.role] || 150000);

        // Secure initial password hashing with Argon2
        const rawPassword = data.initialPassword?.trim() || data.stateOfOrigin?.trim() || 'Password123!';
        const passwordHash = await argon2.hash(rawPassword);

        let dateOfBirth: Date | null = null;
        if (data.dateOfBirth) {
            const parsedDate = new Date(data.dateOfBirth);
            if (!isNaN(parsedDate.getTime())) dateOfBirth = parsedDate;
        }

        let dateOfEmployment: Date | null = null;
        if (data.dateOfEmployment) {
            const parsedDate = new Date(data.dateOfEmployment);
            if (!isNaN(parsedDate.getTime())) dateOfEmployment = parsedDate;
        }

        return staffRepo.createStaffUser({
            staffId,
            firstName: data.firstName.trim(),
            lastName: data.lastName.trim(),
            email: data.email.toLowerCase().trim(),
            phone: data.phone?.trim() || null,
            role: data.role as string,
            departmentId: data.departmentId && data.departmentId !== 'none' ? data.departmentId : null,
            gender: data.gender || null,
            dateOfBirth,
            stateOfOrigin: data.stateOfOrigin || null,
            address: data.address?.trim() || null,
            dateOfEmployment: dateOfEmployment || new Date(),
            baseSalary,
            kioskPin: data.kioskPin?.trim() || null,
            clockInTime: data.clockInTime?.trim() || '08:00',
            clockOutTime: data.clockOutTime?.trim() || '17:00',
            passwordHash,
            requiresPasswordChange: true,
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
        
        const roleDefaults: Record<string, number> = {
            ADMIN: 250000,
            SLT: 280000,
            HOD: 200000,
            ACCOUNTANT: 220000,
            EXAM_OFFICER: 190000,
            TEACHER: 150000,
        };

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
                const staffId = record.staffId?.trim() || await this.generateStaffId(role, importedCount);
                
                const rawPassword = record.initialPassword || record.password || record.stateOfOrigin || 'Password123!';
                const passwordHash = await argon2.hash(rawPassword);

                const parsedSalary = parseFloat(record.baseSalary || record.salary);
                const baseSalary = !isNaN(parsedSalary) && parsedSalary >= 0 
                    ? parsedSalary 
                    : (roleDefaults[role] || 150000);

                await staffRepo.createStaffUser({
                    staffId,
                    firstName: record.firstName.trim(),
                    lastName: record.lastName.trim(),
                    email: record.email.toLowerCase().trim(),
                    phone: record.phone ? String(record.phone).trim() : null,
                    role,
                    departmentId: record.departmentId || null,
                    gender: record.gender || null,
                    stateOfOrigin: record.stateOfOrigin || null,
                    address: record.address || null,
                    baseSalary,
                    kioskPin: record.kioskPin ? String(record.kioskPin).trim() : null,
                    clockInTime: record.clockInTime || '08:00',
                    clockOutTime: record.clockOutTime || '17:00',
                    passwordHash,
                    requiresPasswordChange: true,
                    status: 'active',
                });
                importedCount++;
            } catch (err: any) {
                errorCount++;
                invalidRecords.push({
                    firstName: record.firstName || '',
                    lastName: record.lastName || '',
                    email: record.email || '',
                    error: err.code === 'P2002' ? 'Email or Staff ID already exists' : (err.message || 'Database error')
                });
            }
        }
        return { importedCount, errorCount, invalidRecords };
    }

    static async deleteStaff(userId: string) {
        return staffRepo.deleteStaffUser(userId);
    }
}
