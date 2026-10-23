'use client';

import { useState, useEffect, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  getGraduationClearances,
  initiateGraduationClearance,
  updateDepartmentClearanceAction,
  issueDegreeCertificateAction,
} from '@/actions/graduation-clearance-actions';
import { getCurrentStudentContextAction } from '@/actions/tims-actions';
import { CheckCircle2, XCircle, Award, ShieldCheck, QrCode, Loader2, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function GraduationClearancePage() {
  const [clearances, setClearances] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClearance, setSelectedClearance] = useState<any>(null);
  const [activeDept, setActiveDept] = useState<'bursary' | 'library' | 'department' | 'faculty' | 'studentAffairs' | null>(null);
  const [clearanceNote, setClearanceNote] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const loadClearances = async () => {
    setIsLoading(true);
    const [res, ctxRes] = await Promise.all([
      getGraduationClearances('2025/2026'),
      getCurrentStudentContextAction(),
    ]);
    if (res.success && res.data) {
      setClearances(res.data);
    }
    if (ctxRes.success && ctxRes.data) {
      const studentsList = ctxRes.data.allStudents || (ctxRes.data.student ? [ctxRes.data.student] : []);
      setAllStudents(studentsList);
      if (ctxRes.data.student?.id) {
        setSelectedCandidateId(ctxRes.data.student.id);
      } else if (studentsList.length > 0) {
        setSelectedCandidateId(studentsList[0].id);
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadClearances();
  }, []);

  const handleOpenDeptModal = (clearance: any, dept: any) => {
    setSelectedClearance(clearance);
    setActiveDept(dept);
    setClearanceNote(clearance[`${dept}Note`] || '');
    setIsDialogOpen(true);
  };

  const handleSaveDepartmentClearance = (cleared: boolean) => {
    if (!selectedClearance || !activeDept) return;

    startTransition(async () => {
      const res = await updateDepartmentClearanceAction({
        clearanceId: selectedClearance.id,
        department: activeDept,
        cleared,
        note: clearanceNote,
      });

      if (res.success) {
        toast({
          title: 'Clearance Updated',
          description: `Department status updated to ${cleared ? 'CLEARED' : 'UNCLEARED'}.`,
        });
        setIsDialogOpen(false);
        loadClearances();
      } else {
        toast({ variant: 'destructive', title: 'Update Failed', description: res.error });
      }
    });
  };

  const handleIssueCertificate = (clearanceId: string) => {
    startTransition(async () => {
      const res = await issueDegreeCertificateAction(clearanceId);
      if (res.success) {
        toast({
          title: 'Degree Certificate Issued',
          description: `Certificate generated with tamper-evident QR code and cryptographic ledger verification.`,
        });
        loadClearances();
      } else {
        toast({ variant: 'destructive', title: 'Issuance Blocked', description: res.error });
      }
    });
  };

  const handleInitiateStudentClearance = () => {
    const targetId = selectedCandidateId || '93e0878e-891f-4a60-ad1a-b0019b6c17f2';
    startTransition(async () => {
      const res = await initiateGraduationClearance(targetId, '2025/2026');
      if (res.success) {
        toast({ title: 'Clearance File Created', description: 'Initiated exit clearance checklist for candidate.' });
        loadClearances();
      } else {
        toast({ variant: 'destructive', title: 'Error', description: res.error });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Graduation Exit Clearance &amp; Certification</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Statutory 5-department clearance matrix (Bursary, Library, Department, Faculty, Student Affairs) and cryptographic certificate issuance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {allStudents.length > 0 && (
            <Select value={selectedCandidateId} onValueChange={setSelectedCandidateId}>
              <SelectTrigger className="w-60 h-9 rounded-xl text-xs">
                <SelectValue placeholder="Select candidate" />
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
          <Button onClick={handleInitiateStudentClearance} disabled={isPending} className="flex items-center gap-2 rounded-xl">
            <Sparkles className="h-4 w-4" /> Initialize Candidate Clearance
          </Button>
        </div>
      </div>

      {/* Clearance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Graduation Clearance Ledger</CardTitle>
          <CardDescription>
            Candidates must attain unanimous clearance across all five statutory bodies before a degree certificate is unlocked.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : clearances.length === 0 ? (
            <div className="text-center py-12">
              <Award className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-semibold text-foreground">No Active Graduation Clearance Records</p>
              <p className="text-xs text-muted-foreground mt-1">
                Select a candidate above and click &apos;Initialize Candidate Clearance&apos; to begin final-year exit clearance.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Student / Matric</th>
                    <th className="px-4 py-3">Degree Program</th>
                    <th className="px-4 py-3 text-center">Bursary</th>
                    <th className="px-4 py-3 text-center">Library</th>
                    <th className="px-4 py-3 text-center">Department</th>
                    <th className="px-4 py-3 text-center">Faculty</th>
                    <th className="px-4 py-3 text-center">Student Affairs</th>
                    <th className="px-4 py-3 text-center">Overall</th>
                    <th className="px-4 py-3 text-right">Certificate</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {clearances.map((c) => {
                    const depts = [
                      { key: 'bursary', label: 'Bursary', cleared: c.bursaryCleared },
                      { key: 'library', label: 'Library', cleared: c.libraryCleared },
                      { key: 'department', label: 'Dept', cleared: c.departmentCleared },
                      { key: 'faculty', label: 'Faculty', cleared: c.facultyCleared },
                      { key: 'studentAffairs', label: 'Affairs', cleared: c.studentAffairsCleared },
                    ];

                    const allCleared = depts.every((d) => d.cleared);

                    return (
                      <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-foreground">
                            {c.student?.user?.firstName} {c.student?.user?.lastName}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {c.student?.matricNumber}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-xs">
                          <div className="font-medium text-foreground">{c.student?.program?.code}</div>
                          <div className="text-muted-foreground">{c.student?.program?.name}</div>
                        </td>

                        {depts.map((d) => (
                          <td key={d.key} className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleOpenDeptModal(c, d.key)}
                              className="focus:outline-none transition-transform hover:scale-105"
                            >
                              {d.cleared ? (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] cursor-pointer">
                                  <CheckCircle2 className="h-3 w-3 mr-1" /> Cleared
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 text-[10px] cursor-pointer">
                                  <XCircle className="h-3 w-3 mr-1" /> Pending
                                </Badge>
                              )}
                            </button>
                          </td>
                        ))}

                        <td className="px-4 py-3 text-center">
                          {allCleared ? (
                            <Badge className="bg-emerald-600 text-white text-xs font-semibold">
                              APPROVED
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              PENDING
                            </Badge>
                          )}
                        </td>

                        <td className="px-4 py-3 text-right">
                          {c.certificateIssued ? (
                            <Link href="/dashboard/tertiary/certificate">
                              <Button size="sm" variant="outline" className="text-xs flex items-center gap-1">
                                <QrCode className="h-3.5 w-3.5 text-primary" /> View Certificate
                              </Button>
                            </Link>
                          ) : (
                            <Button
                              size="sm"
                              disabled={!allCleared || isPending}
                              onClick={() => handleIssueCertificate(c.id)}
                              className="text-xs bg-slate-900 hover:bg-slate-800 text-white"
                            >
                              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <ShieldCheck className="h-3.5 w-3.5 mr-1" />}
                              Issue Certificate
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Department Clearance Action Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update {activeDept?.toUpperCase()} Clearance</DialogTitle>
            <DialogDescription>
              Review candidate records and grant statutory department clearance.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label>Clearance Remarks / Ledger Note</Label>
              <Input
                placeholder="e.g. Verified zero outstanding obligations"
                value={clearanceNote}
                onChange={(e) => setClearanceNote(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="flex justify-between gap-2">
            <Button
              variant="outline"
              className="text-red-600 hover:bg-red-50 border-red-200"
              onClick={() => handleSaveDepartmentClearance(false)}
              disabled={isPending}
            >
              Revoke / Mark Pending
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => handleSaveDepartmentClearance(true)}
              disabled={isPending}
            >
              Approve &amp; Clear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
