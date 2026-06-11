
'use client';

import { FinancialReportGenerator } from "@/components/dashboard/reports/financial-report-generator";

export default function FinancialReportsPage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="font-headline text-3xl font-bold">Financial Reports</h1>
                <p className="text-muted-foreground">
                    Generate and view all financial reports.
                </p>
            </div>
            <FinancialReportGenerator />
        </div>
    );
}
