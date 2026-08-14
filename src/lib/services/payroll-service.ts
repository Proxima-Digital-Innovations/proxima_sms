import { PayrollRepository } from '../dal/payroll-repository';

const payrollRepo = new PayrollRepository();

export class PayrollService {
    static async runPayroll(month: number, year: number) {
        const existingRuns = await payrollRepo.getExistingRuns(month, year);
        if (existingRuns.length > 0) {
            throw new Error(`Payroll for ${month}/${year} has already been executed.`);
        }

        const staffWithContracts = await payrollRepo.getStaffWithContracts();
        if (staffWithContracts.length === 0) {
            throw new Error('No staff members with active contracts found.');
        }

        const salaryStructures = await payrollRepo.getSalaryStructures();

        const startOfMonth = new Date(year, month - 1, 1);
        const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
        const monthlyAttendance = await payrollRepo.getMonthlyAttendance(startOfMonth, endOfMonth);

        const EXPECTED_WORK_DAYS = 20;

        const payrollDataToInsert: any[] = [];
        let totalAmount = 0;

        for (const contract of staffWithContracts) {
            let basic = contract.salary || 0;
            let allowance = 0;
            let deduction = 0;

            const userAttendance = monthlyAttendance.filter((a: any) => a.staffId === contract.userId);
            const attendedDays = new Set(userAttendance.map((a: any) => a.date.toISOString().split('T')[0])).size;
            
            let absenteeDeduction = 0;
            if (attendedDays < EXPECTED_WORK_DAYS) {
                const missedDays = EXPECTED_WORK_DAYS - attendedDays;
                const dailyRate = basic / EXPECTED_WORK_DAYS;
                absenteeDeduction = dailyRate * missedDays;
            }

            const totalDeductions = deduction + absenteeDeduction;
            const grossPay = basic + allowance;
            const netPay = grossPay - totalDeductions;

            const details = JSON.stringify({
                basic,
                allowance,
                standardDeduction: deduction,
                attendedDays,
                missedDays: Math.max(0, EXPECTED_WORK_DAYS - attendedDays),
                absenteeDeduction,
                totalDeductions
            });

            payrollDataToInsert.push({
                userId: contract.userId,
                month,
                year,
                amount: netPay,
                grossPay,
                deductions: totalDeductions,
                details,
                status: 'paid',
                paidAt: new Date()
            });

            totalAmount += netPay;
        }

        await payrollRepo.createPayrollRecordsTransaction(payrollDataToInsert);
        
        return { 
            employeeCount: staffWithContracts.length,
            totalAmount
        };
    }

    static async getPayrollHistory() {
        return payrollRepo.getPayrollHistory();
    }
}
