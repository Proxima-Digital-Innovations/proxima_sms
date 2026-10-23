'use client';

import { useState, useEffect, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getStudentAddDropRequests, submitAddDropRequestAction } from '@/actions/add-drop-actions';
import { getTimsOfferings } from '@/actions/tims-actions';
import { ArrowLeftRight, CheckCircle2, Clock, AlertTriangle, Plus, Trash2, Loader2, Sparkles } from 'lucide-react';

export default function CourseAddDropPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [offerings, setOfferings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOffering, setSelectedOffering] = useState<any>(null);
  const [requestType, setRequestType] = useState<'ADD' | 'DROP'>('ADD');
  const [reason, setReason] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const studentProfileId = '93e0878e-891f-4a60-ad1a-b0019b6c17f2'; // Aminu Katsina from seeding
  const session = '2025/2026';
  const semester = 1;

  const loadData = async () => {
    setIsLoading(true);
    const [reqRes, offRes] = await Promise.all([
      getStudentAddDropRequests(studentProfileId, session, semester),
      getTimsOfferings(session, semester),
    ]);

    if (reqRes.success && reqRes.data) setRequests(reqRes.data);
    if (offRes.success && offRes.data) setOfferings(offRes.data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenModal = (offering: any, type: 'ADD' | 'DROP') => {
    setSelectedOffering(offering);
    setRequestType(type);
    setReason('');
    setIsModalOpen(true);
  };

  const handleSubmitRequest = () => {
    if (!selectedOffering || !reason.trim()) {
      toast({ variant: 'destructive', title: 'Reason Required', description: 'Please provide academic rationale for this request.' });
      return;
    }

    startTransition(async () => {
      // Find active registration id
      const registrationId = 'cbt-reg-1';
      const res = await submitAddDropRequestAction({
        studentProfileId,
        registrationId,
        offeringId: selectedOffering.id,
        requestType,
        reason,
      });

      if (res.success) {
        toast({
          title: `Course ${requestType} Submitted`,
          description: `Request logged for academic advisor review. Late surcharge: ₦5,000.`,
        });
        setIsModalOpen(false);
        loadData();
      } else {
        toast({ variant: 'destructive', title: 'Request Rejected', description: res.error });
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
            Submit formal course alteration petitions within the statutory revision window (Weeks 1–3). All changes require advisor endorsement.
          </p>
        </div>

        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs px-3 py-1 font-mono">
          <Clock className="h-3.5 w-3.5 mr-1" /> Revision Window Open: 14 Days Remaining
        </Badge>
      </div>

      {/* Available Offerings Grid for Add/Drop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border shadow-md">
          <CardHeader className="border-b bg-muted/30 pb-4">
            <CardTitle className="text-base font-bold flex items-center justify-between">
              <span>Departmental Course Offerings</span>
              <Badge variant="outline" className="text-xs">
                Semester 1
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              Request to add supplementary or elective courses to your semester load.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 space-y-3">
            {isLoading ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : offerings.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground italic">
                No course offerings found.
              </div>
            ) : (
              offerings.slice(0, 4).map((off) => (
                <div key={off.id} className="p-3.5 rounded-xl border bg-card flex justify-between items-center text-xs hover:border-primary/50 transition-all">
                  <div>
                    <span className="font-bold text-foreground mr-1.5 font-mono">{off.course?.code}</span>
                    <span className="text-foreground font-medium">{off.course?.title}</span>
                    <div className="text-muted-foreground text-[11px] mt-0.5">
                      Units: {off.course?.creditUnits} Credits • Enrolled: {off.enrolledCount}/{off.maxCapacity} Seats
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenModal(off, 'ADD')}
                    className="text-xs shrink-0 flex items-center gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  >
                    <Plus className="h-3.5 w-3.5" /> Request Add
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Revision Requests History */}
        <Card className="border shadow-md">
          <CardHeader className="border-b bg-muted/30 pb-4">
            <CardTitle className="text-base font-bold flex items-center justify-between">
              <span>Add / Drop Petition History</span>
              <Badge variant="outline" className="text-xs">
                {requests.length} Requests
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              Status tracking for submitted course modification requests.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 space-y-3">
            {isLoading ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-12 text-xs text-muted-foreground italic">
                No active Add/Drop requests submitted.
              </div>
            ) : (
              requests.map((req) => (
                <div key={req.id} className="p-3.5 rounded-xl border bg-card text-xs space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Badge className={req.requestType === 'ADD' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}>
                        {req.requestType}
                      </Badge>
                      <span className="font-bold font-mono">{req.offering?.course?.code}</span>
                    </div>

                    <Badge
                      variant="outline"
                      className={
                        req.status === 'APPROVED'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : req.status === 'REJECTED'
                          ? 'border-red-500 bg-red-50 text-red-700'
                          : 'border-amber-500 bg-amber-50 text-amber-700'
                      }
                    >
                      {req.status}
                    </Badge>
                  </div>

                  <p className="text-muted-foreground text-[11px] italic">
                    &quot;{req.reason}&quot;
                  </p>

                  <div className="text-[10px] text-slate-500 flex justify-between border-t pt-1.5 mt-1">
                    <span>Surcharge: ₦{req.lateFeeAmount.toLocaleString()}</span>
                    <span>Date: {new Date(req.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add / Drop Request Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Petition to {requestType} Course</DialogTitle>
            <DialogDescription>
              Submit petition for {selectedOffering?.course?.code}: {selectedOffering?.course?.title} ({selectedOffering?.course?.creditUnits} Credits).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label>Academic Rationale / Justification</Label>
              <Input
                placeholder="e.g. Schedule conflict with major core requirement"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <div className="p-3 bg-muted/40 rounded-xl border text-xs text-muted-foreground space-y-1">
              <div className="font-semibold text-foreground">Statutory Add/Drop Policy:</div>
              <div>• Total registered credits must remain between 15 and 24 units.</div>
              <div>• A late modification surcharge of ₦5,000 applies after Week 2.</div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitRequest} disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Submit Petition
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
