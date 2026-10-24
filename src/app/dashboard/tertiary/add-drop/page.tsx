'use client';

import { useState, useEffect, useTransition, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  getStudentAddDropRequests,
  getAllAddDropRequestsAction,
  submitAddDropRequestAction,
  reviewAddDropRequestAction,
} from '@/actions/add-drop-actions';
import { getTimsOfferings, getCurrentStudentContextAction } from '@/actions/tims-actions';
import { ArrowLeftRight, CheckCircle2, Clock, Plus, Trash2, Loader2, XCircle } from 'lucide-react';

export default function CourseAddDropPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [offerings, setOfferings] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [studentProfileId, setStudentProfileId] = useState<string>('');
  const [isStudentRole, setIsStudentRole] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOffering, setSelectedOffering] = useState<any>(null);
  const [requestType, setRequestType] = useState<'ADD' | 'DROP'>('ADD');
  const [reason, setReason] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const session = '2025/2026';
  const semester = 1;

  const loadData = useCallback(async (overrideStudentId?: string) => {
    setIsLoading(true);
    const [ctxRes, offRes] = await Promise.all([
      getCurrentStudentContextAction(session, semester),
      getTimsOfferings(session, semester),
    ]);

    if (offRes.success && offRes.data) setOfferings(offRes.data);

    if (ctxRes.success && ctxRes.data) {
      setIsStudentRole(ctxRes.data.isStudentRole);
      setAllStudents(ctxRes.data.allStudents || []);
      const activeId = overrideStudentId || ctxRes.data.activeStudent?.id || '';
      setStudentProfileId(activeId);

      if (ctxRes.data.isStudentRole && activeId) {
        const reqRes = await getStudentAddDropRequests(activeId, session, semester);
        if (reqRes.success && reqRes.data) setRequests(reqRes.data);
      } else {
        const allReqRes = await getAllAddDropRequestsAction(session, semester);
        if (allReqRes.success && allReqRes.data) setRequests(allReqRes.data);
      }
    }
    setIsLoading(false);
  }, [session, semester]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenModal = (offering: any, type: 'ADD' | 'DROP') => {
    setSelectedOffering(offering);
    setRequestType(type);
    setReason('');
    setIsModalOpen(true);
  };

  const handleSubmitRequest = () => {
    if (!selectedOffering || !reason.trim() || !studentProfileId) {
      toast({ variant: 'destructive', title: 'Reason Required', description: 'Please provide academic rationale for this request.' });
      return;
    }

    startTransition(async () => {
      const res = await submitAddDropRequestAction({
        studentProfileId,
        academicSession: session,
        semester,
        offeringId: selectedOffering.id,
        requestType,
        reason,
      });

      if (res.success) {
        toast({
          title: `Course ${requestType} Submitted`,
          description: `Request logged for academic advisor review.`,
        });
        setIsModalOpen(false);
        loadData(studentProfileId);
      } else {
        toast({ variant: 'destructive', title: 'Request Rejected', description: res.error });
      }
    });
  };

  const handleReviewRequest = (requestId: string, approved: boolean) => {
    startTransition(async () => {
      const res = await reviewAddDropRequestAction({
        requestId,
        approved,
        rejectionNote: approved ? undefined : 'Credit load or prerequisite policy constraint.',
      });
      if (res.success) {
        toast({
          title: approved ? 'Add/Drop Petition Approved' : 'Add/Drop Petition Declined',
          description: approved
            ? 'Student semester registration has been automatically updated.'
            : 'Petition marked as rejected.',
        });
        loadData(studentProfileId);
      } else {
        toast({ variant: 'destructive', title: 'Review Failed', description: res.error });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Course Add / Drop Revision Window</h1>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Submit formal course alteration petitions within the statutory revision window (Weeks 1&ndash;3). All changes require advisor endorsement.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!isStudentRole && allStudents.length > 0 && (
            <Select value={studentProfileId} onValueChange={(id) => setStudentProfileId(id)}>
              <SelectTrigger className="w-60 rounded-xl">
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
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs px-3 py-1 font-mono">
            <Clock className="h-3.5 w-3.5 mr-1" /> Revision Window Open: 14 Days Remaining
          </Badge>
        </div>
      </div>

      {/* Available Offerings Grid for Add/Drop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border shadow-md">
          <CardHeader className="border-b bg-muted/30 pb-4">
            <CardTitle className="text-base font-bold flex items-center justify-between">
              <span>Departmental Course Offerings</span>
              <Badge variant="outline" className="text-xs">
                Semester {semester}
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              Request to add supplementary or drop elective courses from your semester load.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 space-y-3">
            {isLoading ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : offerings.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                No active course offerings available.
              </div>
            ) : (
              offerings.map((off) => (
                <div
                  key={off.id}
                  className="p-3.5 rounded-xl border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-primary/40 transition-all"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-primary">{off.course.code}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {off.course.creditUnits} Credits
                      </Badge>
                    </div>
                    <p className="font-semibold text-sm text-foreground mt-0.5">{off.course.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Enrolled: {off.enrolledCount}/{off.maxCapacity} seats
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenModal(off, 'ADD')}
                      className="text-xs border-emerald-500/40 text-emerald-700 hover:bg-emerald-50"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenModal(off, 'DROP')}
                      className="text-xs border-red-500/40 text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Drop
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Active Add/Drop Petition Log & Advisor Review */}
        <Card className="border shadow-md">
          <CardHeader className="border-b bg-muted/30 pb-4">
            <CardTitle className="text-base font-bold">
              {isStudentRole ? 'My Add / Drop Petitions' : 'Add / Drop Petitions & Advisor Review'}
            </CardTitle>
            <CardDescription className="text-xs">
              Track approval status and academic advisor endorsements.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 space-y-3">
            {requests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ArrowLeftRight className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">No Add/Drop Requests Submitted</p>
                <p className="text-xs mt-0.5">Select a course on the left to request an addition or withdrawal.</p>
              </div>
            ) : (
              requests.map((req) => (
                <div key={req.id} className="p-4 rounded-xl border bg-card space-y-2 text-xs">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        className={
                          req.requestType === 'ADD'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-red-100 text-red-800 border-red-300'
                        }
                      >
                        {req.requestType} COURSE
                      </Badge>
                      <span className="font-mono font-bold text-foreground">
                        {req.offering?.course?.code} &mdash; {req.offering?.course?.title}
                      </span>
                    </div>

                    <Badge
                      variant={
                        req.status === 'APPROVED'
                          ? 'default'
                          : req.status === 'REJECTED'
                          ? 'destructive'
                          : 'secondary'
                      }
                      className="text-[10px]"
                    >
                      {req.status}
                    </Badge>
                  </div>

                  {req.student && (
                    <p className="text-[11px] font-medium text-foreground">
                      Candidate: {req.student.user?.firstName} {req.student.user?.lastName} ({req.student.matricNumber})
                    </p>
                  )}

                  <p className="text-muted-foreground italic">&ldquo;{req.reason}&rdquo;</p>

                  <div className="flex justify-between items-center pt-2 border-t text-[11px] text-muted-foreground">
                    <span>Late Revision Fee: &#8358;{req.lateFeeAmount?.toLocaleString()}</span>
                    <div className="flex items-center gap-2">
                      <span>{new Date(req.createdAt).toLocaleDateString()}</span>
                      {!isStudentRole && req.status === 'PENDING' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReviewRequest(req.id, true)}
                            disabled={isPending}
                            className="h-7 px-2.5 text-[11px] border-emerald-500/40 text-emerald-700 hover:bg-emerald-50"
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReviewRequest(req.id, false)}
                            disabled={isPending}
                            className="h-7 px-2.5 text-[11px] border-rose-500/40 text-rose-700 hover:bg-rose-50"
                          >
                            <XCircle className="h-3 w-3 mr-1" /> Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Drop Request Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Confirm Course {requestType === 'ADD' ? 'Addition' : 'Withdrawal (Drop)'}
            </DialogTitle>
            <DialogDescription>
              {selectedOffering?.course?.code}: {selectedOffering?.course?.title} ({selectedOffering?.course?.creditUnits} Credit Units)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
              <strong>Statutory Credit Check:</strong> Total registered credits must remain between <strong>15 and 24 units</strong> after this adjustment.
            </div>

            <div className="space-y-1.5">
              <Label>Academic Rationale / Reason for Petition</Label>
              <Input
                placeholder="e.g. Resolving timetable clash or adding required elective..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitRequest}
              disabled={isPending}
              variant={requestType === 'DROP' ? 'destructive' : 'default'}
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Submit {requestType} Petition
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
