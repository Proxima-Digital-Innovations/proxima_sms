'use client';

import { useState, useEffect, useTransition, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  getTimsOfferings,
  registerStudentCoursesAction,
  getCurrentStudentContextAction,
  getSemesterRegistrationsForApprovalAction,
  approveStudentRegistrationAction,
  toggleBursaryClearanceAction,
} from '@/actions/tims-actions';
import { Ticket, CheckCircle2, AlertTriangle, ShieldCheck, Loader2, UserCheck, CreditCard } from 'lucide-react';

export default function TertiaryCourseRegistrationPage() {
  const [offerings, setOfferings] = useState<any[]>([]);
  const [selectedOfferings, setSelectedOfferings] = useState<string[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [studentId, setStudentId] = useState('');
  const [isStudentRole, setIsStudentRole] = useState(true);
  const [submittedRegs, setSubmittedRegs] = useState<any[]>([]);
  const [session] = useState('2025/2026');
  const [semester] = useState(1);
  const [isDeanOverload, setIsDeanOverload] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [lastRegResult, setLastRegResult] = useState<any>(null);
  const { toast } = useToast();

  const loadRegistrationData = useCallback(async (preferredStudentId?: string) => {
    const [offRes, ctxRes, regQueueRes] = await Promise.all([
      getTimsOfferings(session, semester),
      getCurrentStudentContextAction(session, semester),
      getSemesterRegistrationsForApprovalAction(session, semester),
    ]);

    if (offRes.success && offRes.data) setOfferings(offRes.data);
    if (regQueueRes.success && regQueueRes.data) setSubmittedRegs(regQueueRes.data);

    if (ctxRes.success && ctxRes.data) {
      setIsStudentRole(ctxRes.data.isStudentRole);
      setAllStudents(ctxRes.data.allStudents || []);
      const targetStudent =
        (preferredStudentId && ctxRes.data.allStudents?.find((s: any) => s.id === preferredStudentId)) ||
        ctxRes.data.activeStudent;

      if (targetStudent) {
        setStudentId(targetStudent.id);
        const currentReg = targetStudent.registrations?.[0];
        if (currentReg?.courses?.length > 0) {
          setSelectedOfferings(currentReg.courses.map((c: any) => c.offeringId));
        }
      }
    }
  }, [session, semester]);

  useEffect(() => {
    loadRegistrationData();
  }, [loadRegistrationData]);

  const handleStudentSwitch = (newStudentId: string) => {
    setStudentId(newStudentId);
    const stu = allStudents.find((s) => s.id === newStudentId);
    const currentReg = stu?.registrations?.[0];
    if (currentReg?.courses?.length > 0) {
      setSelectedOfferings(currentReg.courses.map((c: any) => c.offeringId));
    } else {
      setSelectedOfferings([]);
    }
  };

  const selectedCourses = offerings.filter((o) => selectedOfferings.includes(o.id));
  const totalCredits = selectedCourses.reduce((acc, curr) => acc + (curr.course?.creditUnits || 0), 0);

  const isBelowMin = totalCredits < 15;
  const isOverMax = totalCredits > 24;
  const canSubmit = !!studentId && !isBelowMin && (!isOverMax || isDeanOverload) && selectedOfferings.length > 0;

  const toggleOffering = (id: string) => {
    setSelectedOfferings((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleRegister = () => {
    if (!canSubmit) return;

    startTransition(async () => {
      const res = await registerStudentCoursesAction({
        studentProfileId: studentId,
        academicSession: session,
        semester,
        offeringIds: selectedOfferings,
        isDeanApprovedOverload: isDeanOverload,
      });

      if (res.success && res.data) {
        setLastRegResult(res.data);
        toast({
          title: 'Course Registration Submitted',
          description: `Successfully locked ${res.data.enrolledCount} course offerings (${res.data.totalCredits} units) for advisor review.`,
        });
        loadRegistrationData(studentId);
      } else {
        toast({
          title: 'Registration Rejected',
          description: res.error,
          variant: 'destructive',
        });
      }
    });
  };

  const handleApproveRegistration = (registrationId: string) => {
    startTransition(async () => {
      const res = await approveStudentRegistrationAction(registrationId);
      if (res.success) {
        toast({
          title: 'Registration Approved',
          description: 'Semester course registration endorsed by Academic Advisor.',
        });
        loadRegistrationData(studentId);
      } else {
        toast({
          title: 'Approval Failed',
          description: res.error,
          variant: 'destructive',
        });
      }
    });
  };

  const handleToggleBursary = (registrationId: string) => {
    startTransition(async () => {
      const res = await toggleBursaryClearanceAction(registrationId);
      if (res.success) {
        toast({
          title: 'Bursary Clearance Updated',
          description: 'Updated student tuition clearance status for exam docket.',
        });
        loadRegistrationData(studentId);
      } else {
        toast({
          title: 'Error',
          description: res.error,
          variant: 'destructive',
        });
      }
    });
  };

  const currentStudentObj = allStudents.find((s) => s.id === studentId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card border border-border p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Ticket className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Course Registration Portal</h1>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Enforce semester credit quotas (15&ndash;24 units), recursive prerequisite validations, and real-time seat reservation locks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!isStudentRole && allStudents.length > 0 && (
            <Select value={studentId} onValueChange={handleStudentSwitch}>
              <SelectTrigger className="w-64 rounded-xl">
                <SelectValue placeholder="Select Undergraduate" />
              </SelectTrigger>
              <SelectContent>
                {allStudents.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.matricNumber} &mdash; {s.user?.firstName} {s.user?.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Badge className="bg-primary/10 text-primary border-primary/20 text-xs px-3 py-1 font-mono">
            Session: {session} &bull; Semester {semester}
          </Badge>
        </div>
      </div>

      {currentStudentObj && (
        <div className="bg-muted/30 border border-border rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Active Candidate: </span>
            <span className="font-bold text-foreground">
              {currentStudentObj.user?.firstName} {currentStudentObj.user?.lastName}
            </span>
            <span className="font-mono text-primary ml-2">({currentStudentObj.matricNumber})</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{currentStudentObj.program?.name || 'Undergraduate'}</Badge>
            <Badge variant="secondary">{currentStudentObj.currentLevel} Level</Badge>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Course Selection List */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border border-border bg-card rounded-2xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold text-foreground">Available Course Offerings</CardTitle>
              <CardDescription className="text-xs">
                Select courses matching your curriculum requirement for this semester.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {offerings.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-xs">
                  No active course offerings found for {session} Semester {semester}.
                </div>
              ) : (
                offerings.map((off) => {
                  const isChecked = selectedOfferings.includes(off.id);
                  const isFull = !isChecked && off.enrolledCount >= off.maxCapacity;

                  return (
                    <div
                      key={off.id}
                      onClick={() => !isFull && toggleOffering(off.id)}
                      className={`flex items-start justify-between p-4 rounded-xl border transition-all cursor-pointer ${
                        isChecked
                          ? 'border-primary bg-primary/5'
                          : isFull
                          ? 'border-border/50 bg-muted/40 opacity-60 cursor-not-allowed'
                          : 'border-border hover:border-border/80 bg-card'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isChecked}
                          disabled={isFull}
                          className="mt-1"
                          onCheckedChange={() => !isFull && toggleOffering(off.id)}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-foreground">{off.course?.code}</span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-medium">
                              {off.course?.creditUnits} Units
                            </Badge>
                            {isFull && <Badge variant="destructive" className="text-[10px]">Full</Badge>}
                          </div>
                          <p className="text-sm font-semibold text-foreground mt-0.5">{off.course?.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Level: {off.course?.level} &bull; Available Seats: {Math.max(0, off.maxCapacity - off.enrolledCount)} of {off.maxCapacity}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Real-time Summary Card */}
        <div className="space-y-4">
          <Card className="border border-border bg-card rounded-2xl shadow-sm sticky top-24">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-lg font-bold text-foreground">Registration Summary</CardTitle>
              <CardDescription className="text-xs">Statutory Credit Limits: Min 15 | Max 24</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-4">
              <div className="p-4 rounded-xl bg-muted/50 border border-border flex items-center justify-between">
                <div>
                  <span className="text-xs text-muted-foreground uppercase font-semibold">Total Load</span>
                  <p className="text-3xl font-black text-foreground mt-0.5">{totalCredits} <span className="text-sm font-normal text-muted-foreground">Units</span></p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-muted-foreground uppercase font-semibold">Courses</span>
                  <p className="text-2xl font-bold text-foreground mt-0.5">{selectedOfferings.length}</p>
                </div>
              </div>

              {/* Status Indicators */}
              {isBelowMin && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Deficit load: You must select at least 15 credit units.</span>
                </div>
              )}

              {isOverMax && !isDeanOverload && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Credit overload (&gt; 24 units). Requires formal Dean authorization.</span>
                </div>
              )}

              {canSubmit && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Within accredited credit load limits. Ready to submit.</span>
                </div>
              )}

              {/* Dean Overload Clearance Checkbox */}
              <div className="pt-2 border-t border-border flex items-start gap-2">
                <Checkbox
                  id="dean-overload"
                  checked={isDeanOverload}
                  onCheckedChange={(checked) => setIsDeanOverload(!!checked)}
                />
                <Label htmlFor="dean-overload" className="text-xs text-muted-foreground leading-snug cursor-pointer">
                  Apply Dean Credit Overload Waiver (Permits up to 28 units for final-year graduating students)
                </Label>
              </div>
            </CardContent>

            <CardFooter className="pt-2">
              <Button
                onClick={handleRegister}
                disabled={!canSubmit || isPending}
                className="w-full rounded-xl shadow-sm"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Locking Seats...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4 mr-2" /> Submit Course Registration
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          {lastRegResult && (
            <Card className="border-emerald-500/30 bg-emerald-500/5 rounded-2xl p-4 text-xs space-y-1">
              <div className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Registration Confirmed
              </div>
              <p className="text-muted-foreground">
                Status: <span className="font-mono font-semibold text-foreground">{lastRegResult.status}</span> &bull; {lastRegResult.totalCredits} Credit Units
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Advisor & HOD Registration Approval Queue (Visible to Staff/Advisors/Admins) */}
      {!isStudentRole && submittedRegs.length > 0 && (
        <Card className="border border-border bg-card rounded-2xl shadow-sm">
          <CardHeader className="border-b border-border/60 pb-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" /> Academic Advisor Approval &amp; Bursary Clearance Queue
            </CardTitle>
            <CardDescription className="text-xs">
              Approve student semester course registrations to unlock examination dockets and hall passes.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {submittedRegs.map((reg) => (
                <div key={reg.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-foreground">
                        {reg.student?.user?.firstName} {reg.student?.user?.lastName}
                      </span>
                      <Badge variant="outline" className="font-mono text-[11px]">
                        {reg.student?.matricNumber}
                      </Badge>
                      <Badge
                        className={
                          reg.status === 'ADVISOR_APPROVED'
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                        }
                      >
                        {reg.status}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={
                          reg.isBursaryCleared
                            ? 'border-emerald-500/30 text-emerald-600'
                            : 'border-rose-500/30 text-rose-500'
                        }
                      >
                        {reg.isBursaryCleared ? 'Bursary Cleared' : 'Tuition Pending'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {reg.student?.program?.name} &bull; {reg.totalCredits} Credit Units ({reg.courses?.length || 0} Courses:{' '}
                      {reg.courses?.map((c: any) => c.offering?.course?.code).join(', ')})
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleBursary(reg.id)}
                      disabled={isPending}
                      className="text-xs rounded-xl"
                    >
                      <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                      {reg.isBursaryCleared ? 'Revoke Bursary' : 'Clear Bursary'}
                    </Button>
                    {reg.status !== 'ADVISOR_APPROVED' && (
                      <Button
                        size="sm"
                        onClick={() => handleApproveRegistration(reg.id)}
                        disabled={isPending}
                        className="text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Approve Registration
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
