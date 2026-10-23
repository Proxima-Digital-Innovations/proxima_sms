'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getStudentGraduationClearance } from '@/actions/graduation-clearance-actions';
import { getCurrentStudentContextAction } from '@/actions/tims-actions';
import { Award, Printer, ShieldCheck, ArrowLeft, Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function StudentDegreeCertificatePage() {
  const [clearance, setClearance] = useState<any>(null);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [isStudentRole, setIsStudentRole] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      const ctxRes = await getCurrentStudentContextAction();
      let targetId = '93e0878e-891f-4a60-ad1a-b0019b6c17f2';
      if (ctxRes.success && ctxRes.data) {
        setIsStudentRole(ctxRes.data.isStudentRole);
        setAllStudents(ctxRes.data.allStudents || []);
        if (ctxRes.data.student?.id) {
          targetId = ctxRes.data.student.id;
        }
      }
      setSelectedStudentId(targetId);
      const res = await getStudentGraduationClearance(targetId);
      if (res.success && res.data) {
        setClearance(res.data);
      } else {
        setClearance(null);
      }
      setIsLoading(false);
    }
    init();
  }, []);

  const handleSelectStudent = async (id: string) => {
    setSelectedStudentId(id);
    setIsLoading(true);
    const res = await getStudentGraduationClearance(id);
    if (res.success && res.data) {
      setClearance(res.data);
    } else {
      setClearance(null);
    }
    setIsLoading(false);
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Bar (Hidden on print) */}
      <div className="flex flex-wrap justify-between items-center gap-3 print:hidden bg-card p-4 rounded-xl border shadow-sm">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/tertiary/clearance">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <span className="font-semibold text-sm">Official Degree Parchment</span>
        </div>

        <div className="flex items-center gap-2">
          {!isStudentRole && allStudents.length > 0 && (
            <Select value={selectedStudentId} onValueChange={handleSelectStudent}>
              <SelectTrigger className="w-60 h-9 rounded-xl text-xs">
                <SelectValue placeholder="Switch student" />
              </SelectTrigger>
              <SelectContent>
                {allStudents.map((st: any) => (
                  <SelectItem key={st.id} value={st.id}>
                    {st.matricNumber} — {st.user?.firstName} {st.user?.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {clearance?.certificateIssued && (
            <Button onClick={handlePrint} className="flex items-center gap-2 bg-slate-900 text-white hover:bg-slate-800">
              <Printer className="h-4 w-4" /> Print / Save Diploma PDF
            </Button>
          )}
        </div>
      </div>

      {!clearance || !clearance.certificateIssued ? (
        <div className="max-w-xl mx-auto py-16 text-center space-y-4">
          <div className="bg-amber-100 text-amber-700 h-16 w-16 rounded-full flex items-center justify-center mx-auto">
            <Award className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold">Degree Certificate Pending Clearance</h2>
          <p className="text-sm text-muted-foreground">
            Degree certificates are only generated after unanimous exit clearance across Bursary, Library, Department, Faculty, and Student Affairs.
          </p>
          <Link href="/dashboard/tertiary/clearance">
            <Button variant="outline" className="mt-4">
              Check Clearance Progress
            </Button>
          </Link>
        </div>
      ) : (
        <div className="p-4 bg-muted/30 rounded-2xl print:p-0 print:bg-white">
          {(() => {
            const student = clearance.student;
            const standing = student.academicStandings?.[0];
            const honours = standing?.degreeClassification || 'First Class Honours';
            return (
              <div className="relative bg-gradient-to-b from-amber-50/40 via-white to-amber-50/30 border-8 border-double border-amber-900/30 rounded-2xl p-8 sm:p-14 shadow-2xl text-center space-y-8 print:shadow-none print:border-amber-900/80 print:rounded-none">
                {/* Institutional Crest / Header */}
                <div className="space-y-3">
                  <div className="mx-auto w-20 h-20 rounded-full border-2 border-amber-700/50 bg-amber-50 flex items-center justify-center shadow-inner">
                    <Award className="h-10 w-10 text-amber-900" />
                  </div>
                  <h1 className="font-serif text-3xl sm:text-4xl font-extrabold tracking-widest text-slate-900 uppercase">
                    University Senate &amp; Academic Board
                  </h1>
                  <p className="font-serif italic text-amber-900/80 text-sm">
                    By the Authority of the Governing Council and Senate of the University
                  </p>
                </div>

                <div className="py-2">
                  <p className="font-serif text-base text-slate-700">
                    Be it known that, upon the satisfactory completion of the required course of study and compliance with all statutory standards,
                  </p>
                  <h2 className="font-serif text-3xl sm:text-4xl font-bold text-slate-950 mt-4 tracking-wide underline decoration-amber-600/40 underline-offset-8">
                    {student.user.firstName} {student.user.lastName}
                  </h2>
                  <p className="font-mono text-xs text-muted-foreground mt-2">
                    Matriculation Identifier: {student.matricNumber}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="font-serif text-base text-slate-700">has been admitted to the Degree of</p>
                  <h3 className="font-serif text-2xl sm:text-3xl font-extrabold text-amber-950">
                    {student.program.name}
                  </h3>
                  <p className="font-serif text-lg text-slate-800 italic mt-1">
                    with {honours}
                  </p>
                </div>

                <p className="font-serif text-xs text-slate-600 max-w-2xl mx-auto leading-relaxed">
                  with all the Honours, Rights, and Privileges thereunto appertaining. Given under the Seal of the University this{' '}
                  {clearance.issuedAt ? new Date(clearance.issuedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : '2026'}.
                </p>

                {/* Signatures & Tamper-Evident QR Verification */}
                <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 items-end pt-8 border-t border-amber-900/20 text-xs text-slate-700">
                  {/* Chancellor / VC Signature */}
                  <div className="space-y-2 text-center">
                    <div className="font-serif italic text-base text-slate-900 font-bold border-b border-slate-400 pb-1 mx-4">
                      Prof. A. B. Danmarna
                    </div>
                    <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Vice Chancellor &amp; Senate Chair
                    </div>
                  </div>

                  {/* High-Density Cryptographic QR Code */}
                  <div className="flex flex-col items-center space-y-1">
                    {clearance.certificateQrCode && (
                      <div className="bg-white p-1.5 rounded-lg border border-amber-900/30 shadow-sm">
                        <Image
                          src={clearance.certificateQrCode}
                          alt="Degree Verification QR"
                          width={96}
                          height={96}
                          className="w-24 h-24"
                        />
                      </div>
                    )}
                    <div className="text-[10px] font-mono text-amber-950 font-bold">
                      {clearance.certificateNumber}
                    </div>
                    <div className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                      <ShieldCheck className="h-3 w-3 text-emerald-600" /> Tamper-Proof Cryptographic Hash
                    </div>
                  </div>

                  {/* Registrar Signature */}
                  <div className="space-y-2 text-center">
                    <div className="font-serif italic text-base text-slate-900 font-bold border-b border-slate-400 pb-1 mx-4">
                      Dr. M. S. Bello, FNIM
                    </div>
                    <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Registrar &amp; Secretary to Senate
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
