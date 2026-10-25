'use client';

import { useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldAlert, Mail, Download, Loader2 } from 'lucide-react';
import { Suspense, useState } from 'react';
import { exportSchoolData } from '@/actions/export-actions';
import { useToast } from '@/hooks/use-toast';

function LicenseExpiredContent() {
  const searchParams = useSearchParams();
  const schoolName = searchParams.get('school') || 'This school';
  const schoolId = searchParams.get('schoolId');
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
      setIsExporting(true);
      try {
          const res = await exportSchoolData();
          if (res.success && res.data) {
              // Trigger download for students
              const studentBlob = new Blob([res.data.students], { type: 'text/csv' });
              const studentUrl = URL.createObjectURL(studentBlob);
              const a = document.createElement('a');
              a.href = studentUrl;
              a.download = `students_export.csv`;
              a.click();
              
              // Trigger download for staff
              setTimeout(() => {
                  const staffBlob = new Blob([res.data.staff], { type: 'text/csv' });
                  const staffUrl = URL.createObjectURL(staffBlob);
                  const b = document.createElement('a');
                  b.href = staffUrl;
                  b.download = `staff_export.csv`;
                  b.click();
              }, 500);

              toast({ title: 'Export Complete', description: 'Your core data has been downloaded.' });
          } else {
              toast({ title: 'Export Failed', description: res.error, variant: 'destructive' });
          }
      } catch (error) {
          toast({ title: 'Export Failed', description: 'An unexpected error occurred.', variant: 'destructive' });
      } finally {
          setIsExporting(false);
      }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md bg-neutral-900 border-rose-500/30">
        <CardContent className="pt-10 pb-8 px-8 text-center space-y-6">
          <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto border border-rose-500/20">
            <ShieldAlert className="w-10 h-10 text-rose-500" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-white">License Expired</h1>
            <p className="text-neutral-400 leading-relaxed">
              The Proxima SMS license for <strong className="text-white">{schoolName}</strong> has expired or been suspended.
            </p>
          </div>

          <div className="bg-black/50 border border-white/5 p-4 rounded-xl text-left space-y-2">
            <p className="text-sm text-neutral-400">
              You can no longer use the software to make changes, but your data is safe and belongs to you.
            </p>
          </div>

          <div className="flex flex-col gap-3">
              <a 
                href="/dashboard/system/license"
                className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors"
              >
                Go to License Activation Page
              </a>

              <button onClick={handleExport} disabled={isExporting} className="w-full py-3 bg-neutral-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-neutral-700 transition-colors disabled:opacity-50">
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} 
                Export My Data
              </button>

              <a 
                href="mailto:support@proximahub.com?subject=License%20Renewal%20Request"
                className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                <Mail className="w-4 h-4" /> Contact Support to Renew
              </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LicenseExpiredPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral-950 flex items-center justify-center"><div className="w-8 h-8 border-4 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" /></div>}>
      <LicenseExpiredContent />
    </Suspense>
  );
}
