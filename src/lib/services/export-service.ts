import { ExportRepository } from '../dal/export-repository';

export class ExportService {
    static async exportSchoolData() {
        const students = await ExportRepository.getStudents();
        const staff = await ExportRepository.getStaff();

        // Convert to CSV strings
        const studentCsvHeader = "StudentID,FirstName,LastName,Gender,Status,AdmissionDate\n";
        const studentCsvBody = students.map((s: any) => `"${s.studentId}","${s.firstName}","${s.lastName}","${s.gender}","${s.status}","${s.admissionDate.toISOString()}"`).join("\n");

        const staffCsvHeader = "StaffID,FirstName,LastName,Email,Phone,Role,Status\n";
        const staffCsvBody = staff.map((s: any) => `"${s.staffId || ''}","${s.firstName}","${s.lastName}","${s.email}","${s.phone || ''}","${s.role}","${s.status}"`).join("\n");

        return {
            students: studentCsvHeader + studentCsvBody,
            staff: staffCsvHeader + staffCsvBody
        };
    }
}
