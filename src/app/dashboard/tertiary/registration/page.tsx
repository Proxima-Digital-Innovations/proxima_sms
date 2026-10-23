'use client';

import { useState, useEffect, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getTimsOfferings, registerStudentCoursesAction } from '@/actions/tims-actions';
import { Ticket, CheckCircle2, AlertTriangle, ShieldCheck, Lock, ArrowRight, Loader2 } from 'lucide-react';

export default function TertiaryCourseRegistrationPage() {
  const [offerings, setOfferings] = useState<any[]>([]);
  const [selectedOfferings, setSelectedOfferings] = useState<string[]>([]);
  const [studentId, setStudentId] = useState('demo-student-id');
  const [session, setSession] = useState('2025/2026');
  const [semester, setSemester] = useState(1);
  const [isDeanOverload, setIsDeanOverload] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [lastRegResult, setLastRegResult] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchOfferings() {
      const res = await getTimsOfferings(session, semester);
      if (res.success && res.data) setOfferings(res.data);
    }
    fetchOfferings();
  }, [session, semester]);

  const selectedCourses = offerings.filter((o) => selectedOfferings.includes(o.id));
  const totalCredits = selectedCourses.reduce((acc, curr) => acc + (curr.course?.creditUnits || 0), 0);

  const isBelowMin = totalCredits < 15;
  const isOverMax = totalCredits > 24;
  const canSubmit = !isBelowMin && (!isOverMax || isDeanOverload) && selectedOfferings.length > 0;

  const toggleOffering = (id: string) => {
    setSelectedOfferings((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleRegister = () => {
    if (!canSubmit) return;

    startTransition(async () => {
      // If studentProfile doesn't exist yet, we handle gracefully or create demo
      const res = await registerStudentCoursesAction({
        studentProfileId: studentId,
        academicSession: session,
        semester,
        offeringIds: selectedOfferings,
        isDeanApprovedOverload: isDeanOverload,
      });

      if (res.success) {
        setLastRegResult(res.data);
        toast({
          title: 'Course Registration Submitted',
          description: `Successfully locked ${res.data.enrolledCount} course offerings for advisor review.`,
        });
      } else {
        toast({
          title: 'Registration Rejected',
          description: res.error,
          variant: 'destructive',
        });
      }
    });
  };

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
            Enforce semester credit quotas (15–24 units), recursive prerequisite validations, and real-time seat reservation locks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge className="bg-primary/10 text-primary border-primary/20 text-xs px-3 py-1 font-mono">
            Session: {session} • Semester {semester}
          </Badge>
        </div>
      </div>

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
                  const isFull = off.enrolledCount >= off.maxCapacity;

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
                            Level: {off.course?.level} • Available Seats: {off.maxCapacity - off.enrolledCount} of {off.maxCapacity}
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
                  onCheckedChange={(c) => setIsDeanOverload(!!c)}
                />
                <Label htmlFor="dean-overload" className="text-xs leading-relaxed text-muted-foreground cursor-pointer">
                  Dean Credit Overload Clearance granted for final year / remedial candidate.
                </Label>
              </div>
            </CardContent>

            <CardFooter className="pt-2 border-t border-border">
              <Button
                className="w-full rounded-xl"
                disabled={!canSubmit || isPending}
                onClick={handleRegister}
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Executing Row Lock...
                  </>
                ) : (
                  <>
                    Submit Course Registration
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
