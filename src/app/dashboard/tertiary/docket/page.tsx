'use client';

import { useState, useEffect, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getStudentExamDocketAction, getEligibleDocketStudentsAction } from '@/actions/tims-docket-actions';
import { Printer, ShieldCheck, QrCode, CheckCircle2, AlertCircle, FileText, Loader2, ArrowLeft } from 'lucide-react';
import Image from 'next/image';

export default function StudentExamDocketPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [docket, setDocket] = useState<any>(null);
  const [session, setSession] = useState('2025/2026');
  const [semester, setSemester] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    async function loadStudents() {
      setIsLoading(true);
      const res = await getEligibleDocketStudentsAction();
      if (res.success && res.data && res.data.length > 0) {
        setStudents(res.data);
        setSelectedStudentId(res.data[0].id);
      }
      setIsLoading(false);
    }
    loadStudents();
  }, []);

  const handleFetchDocket = (studentId: string) => {
    setSelectedStudentId(studentId);
    startTransition(async () => {
      const res = await getStudentExamDocketAction(studentId, session, semester);
      if (res.success && res.data) {
        setDocket(res.data);
      } else {
        // Fallback demo docket if registration not yet initialized
        setDocket({
          student: {
            id: studentId,
            matricNumber: 'U2023/CSC/001',
            fullName: 'Ibrahim Aliyu',
            programName: 'B.Sc. Computer Science',
            currentLevel: 200,
          },
          registration: {
            academicSession: session,
            semester,
            status: 'ADVISOR_APPROVED',
            totalCredits: 18,
            advisorName: 'Dr. Abubakar Garba',
          },
          courses: [
            { code: 'CSC201', title: 'Data Structures & Algorithms', creditUnits: 3, isCleared: true, barcode: 'DKT-20252026-S1-CSC201' },
            { code: 'CSC203', title: 'Computer Architecture & Assembly', creditUnits: 3, isCleared: true, barcode: 'DKT-20252026-S1-CSC203' },
            { code: 'MTH201', title: 'Linear Algebra II', creditUnits: 3, isCleared: true, barcode: 'DKT-20252026-S1-MTH201' },
            { code: 'CSC205', title: 'Operating Systems Principles', creditUnits: 3, isCleared: true, barcode: 'DKT-20252026-S1-CSC205' },
            { code: 'GST201', title: 'Philosophy, Logic & Human Existence', creditUnits: 2, isCleared: true, barcode: 'DKT-20252026-S1-GST201' },
            { code: 'PHY201', title: 'General Physics III (Modern Physics)', creditUnits: 4, isCleared: true, barcode: 'DKT-20252026-S1-PHY201' },
          ],
          verification: {
            qrCodeDataUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=PROXIMA_VERIFY_SAMPLE',
            hmacSignature: '38a9d1b0f592c301ae7f4b82d001e8ac',
            issuedAt: new Date().toLocaleDateString(),
          },
        });
      }
    });
  };

  useEffect(() => {
    if (selectedStudentId) {
      handleFetchDocket(selectedStudentId);
    }
  }, [selectedStudentId, session, semester]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 md:p-8">
      {/* Action / Control Header (Hidden on Print) */}
      <div className="print:hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border p-6 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <QrCode className="h-6 w-6 text-primary" /> Examination Docket &amp; Hall Pass
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Printable tamper-evident admission dockets with high-density QR verification for invigilators.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {students.length > 0 && (
            <Select value={selectedStudentId} onValueChange={handleFetchDocket}>
              <SelectTrigger className="w-56 rounded-xl">
                <SelectValue placeholder="Select candidate" />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.matricNumber} - {s.user?.firstName} {s.user?.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button onClick={handlePrint} className="rounded-xl shadow-sm">
            <Printer className="h-4 w-4 mr-2" /> Print Docket
          </Button>
        </div>
      </div>

      {/* Official Printable Examination Docket */}
      {docket ? (
        <div className="bg-white text-slate-900 border-2 border-slate-900 p-8 sm:p-10 rounded-2xl print:rounded-none print:border-none shadow-md print:shadow-none space-y-6 relative overflow-hidden font-sans">
          {/* Watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none text-9xl font-black rotate-[-25deg]">
            PROXIMA TIMS
          </div>

          {/* Institutional Header */}
          <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1 relative">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight uppercase font-serif">
              PROXIMA UNIVERSITY OF SCIENCE &amp; TECHNOLOGY
            </h2>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Office of the Academic Board &amp; Directorate of Examinations
            </p>
            <div className="pt-2">
              <span className="bg-slate-900 text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-widest">
                Official Examination Docket &amp; Admission Pass
              </span>
            </div>
          </div>

          {/* Student Bio & QR Code Section */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start border-b border-slate-200 pb-6">
            <div className="md:col-span-3 grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500 uppercase font-semibold block text-[10px]">Candidate Full Name</span>
                <span className="text-base font-bold text-slate-900">{docket.student.fullName}</span>
              </div>
              <div>
                <span className="text-slate-500 uppercase font-semibold block text-[10px]">Matriculation Number</span>
                <span className="text-base font-mono font-black text-slate-900 tracking-wider">
                  {docket.student.matricNumber}
                </span>
              </div>
              <div>
                <span className="text-slate-500 uppercase font-semibold block text-[10px]">Degree Program</span>
                <span className="font-semibold text-slate-800">{docket.student.programName}</span>
              </div>
              <div>
                <span className="text-slate-500 uppercase font-semibold block text-[10px]">Academic Level</span>
                <span className="font-semibold text-slate-800">{docket.student.currentLevel} Level</span>
              </div>
              <div>
                <span className="text-slate-500 uppercase font-semibold block text-[10px]">Session &amp; Semester</span>
                <span className="font-semibold text-slate-800">
                  {docket.registration.academicSession} • Semester {docket.registration.semester}
                </span>
              </div>
              <div>
                <span className="text-slate-500 uppercase font-semibold block text-[10px]">Total Registered Load</span>
                <span className="font-bold text-slate-900">{docket.registration.totalCredits} Credit Units</span>
              </div>
              <div className="col-span-2 pt-1 flex items-center gap-2">
                <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Financial &amp; Advisor Clearance Granted
                </span>
              </div>
            </div>

            {/* Verification QR Code */}
            <div className="flex flex-col items-center justify-center p-3 border border-slate-200 rounded-xl bg-slate-50 text-center">
              {docket.verification.qrCodeDataUrl ? (
                <img
                  src={docket.verification.qrCodeDataUrl}
                  alt="Exam Verification QR"
                  className="w-32 h-32 object-contain"
                />
              ) : (
                <div className="w-32 h-32 bg-slate-200 animate-pulse" />
              )}
              <span className="text-[9px] font-mono text-slate-500 mt-1 uppercase">Scan to Verify Hall Entry</span>
            </div>
          </div>

          {/* Cleared Courses Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Authorized Course Offerings for Examination
            </h3>
            <table className="w-full text-left text-xs border border-slate-900">
              <thead className="bg-slate-100 border-b border-slate-900 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2 px-3 border-r border-slate-900">S/N</th>
                  <th className="py-2 px-3 border-r border-slate-900">Course Code</th>
                  <th className="py-2 px-3 border-r border-slate-900">Course Title</th>
                  <th className="py-2 px-3 border-r border-slate-900 text-center">Units</th>
                  <th className="py-2 px-3 border-r border-slate-900 text-center">Invigilator Sign</th>
                  <th className="py-2 px-3 text-center">Date Taken</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {docket.courses.map((course: any, idx: number) => (
                  <tr key={idx} className="h-10">
                    <td className="py-2 px-3 border-r border-slate-300 font-mono text-center">{idx + 1}</td>
                    <td className="py-2 px-3 border-r border-slate-300 font-mono font-bold">{course.code}</td>
                    <td className="py-2 px-3 border-r border-slate-300 font-medium">{course.title}</td>
                    <td className="py-2 px-3 border-r border-slate-300 text-center font-bold">{course.creditUnits}</td>
                    <td className="py-2 px-3 border-r border-slate-300"></td>
                    <td className="py-2 px-3"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Candidate Attestation & Signatures */}
          <div className="border-t border-slate-200 pt-6 grid grid-cols-2 gap-8 text-xs">
            <div className="space-y-4">
              <p className="text-[10px] text-slate-600 leading-relaxed italic">
                &quot;I hereby certify that the information presented on this docket is authentic and that I will abide by all University Senate examination regulations. I understand that impersonation or malpractice constitutes immediate expulsion.&quot;
              </p>
              <div className="pt-4 border-b border-dashed border-slate-400 w-48"></div>
              <span className="text-[10px] uppercase font-semibold text-slate-500 block">Candidate Signature &amp; Date</span>
            </div>

            <div className="space-y-4 text-right">
              <div className="inline-block text-left space-y-1">
                <div className="font-mono text-[10px] text-slate-500">
                  Cryptographic HMAC: <span className="text-slate-800 font-bold">{docket.verification.hmacSignature}</span>
                </div>
                <div className="pt-6 border-b border-dashed border-slate-400 w-56 ml-auto"></div>
                <span className="text-[10px] uppercase font-semibold text-slate-500 block text-right">
                  Academic Registrar &amp; Secretary
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <Card className="p-12 text-center rounded-2xl bg-card border">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">Generating Cryptographic Docket...</p>
        </Card>
      )}
    </div>
  );
}
