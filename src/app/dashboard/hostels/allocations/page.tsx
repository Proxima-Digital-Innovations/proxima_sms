'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Building2, 
  Bed, 
  ArrowLeft, 
  Search, 
  Filter, 
  QrCode, 
  Printer, 
  CheckCircle2, 
  LogOut, 
  LogIn, 
  Key, 
  FileText, 
  User, 
  CalendarCheck,
  ShieldCheck,
  Clock,
  ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { getAllocationsList, checkInStudent, checkOutStudent, getHostelsList } from '@/actions/hostel-actions';

export default function HostelAllocationsPage() {
  const [allocations, setAllocations] = useState<any[]>([]);
  const [hostels, setHostels] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [hostelFilter, setHostelFilter] = useState('ALL');

  // Check In Modal
  const [selectedAllocForCheckIn, setSelectedAllocForCheckIn] = useState<any>(null);
  const [checkInPorter, setCheckInPorter] = useState('Hall Porter Desk');
  const [checkInKeyTag, setCheckInKeyTag] = useState('');
  const [checkInInventory, setCheckInInventory] = useState('Mattress, study table, and wardrobe key verified in good condition.');

  // Check Out Modal
  const [selectedAllocForCheckOut, setSelectedAllocForCheckOut] = useState<any>(null);
  const [checkOutPorter, setCheckOutPorter] = useState('Hall Porter Desk');
  const [checkOutClearance, setCheckOutClearance] = useState('Room key surrendered. All electrical fittings and furniture in order.');

  // Printable Slip Modal
  const [selectedSlip, setSelectedSlip] = useState<any>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [allocRes, hostRes] = await Promise.all([
        getAllocationsList({
          hostelId: hostelFilter,
          status: statusFilter,
        }),
        getHostelsList(),
      ]);

      if (allocRes.success) setAllocations(allocRes.data || []);
      if (hostRes.success) setHostels(hostRes.data || []);
    } catch (err: any) {
      toast({ title: 'Error', description: 'Failed to fetch allocations.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [hostelFilter, statusFilter]);

  const handleConfirmCheckIn = async () => {
    if (!selectedAllocForCheckIn) return;
    startTransition(async () => {
      const res = await checkInStudent(selectedAllocForCheckIn.id, {
        porterName: checkInPorter,
        keyTag: checkInKeyTag,
        inventoryNotes: checkInInventory,
      });

      if (res.success) {
        toast({ title: 'Check-In Confirmed', description: 'Student checked into hall and key issued.' });
        setSelectedAllocForCheckIn(null);
        loadData();
      } else {
        toast({ title: 'Check-In Failed', description: res.error, variant: 'destructive' });
      }
    });
  };

  const handleConfirmCheckOut = async () => {
    if (!selectedAllocForCheckOut) return;
    startTransition(async () => {
      const res = await checkOutStudent(selectedAllocForCheckOut.id, {
        porterName: checkOutPorter,
        clearanceNotes: checkOutClearance,
      });

      if (res.success) {
        toast({ title: 'Check-Out Confirmed', description: 'Student vacated and bedspace returned to pool.' });
        setSelectedAllocForCheckOut(null);
        loadData();
      } else {
        toast({ title: 'Check-Out Failed', description: res.error, variant: 'destructive' });
      }
    });
  };

  const filtered = allocations.filter(a => {
    const student = a.studentProfile?.user || a.student;
    const matric = a.studentProfile?.matricNumber || a.student?.studentId || '';
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      a.allocationRef.toLowerCase().includes(q) ||
      (student && `${student.firstName} ${student.lastName}`.toLowerCase().includes(q)) ||
      matric.toLowerCase().includes(q) ||
      a.room.roomNumber.toLowerCase().includes(q);
    return matchesSearch;
  });

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300 w-full min-w-0">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-background p-5 sm:p-6 rounded-2xl border border-border shadow-sm">
        <div>
          <Link href="/dashboard/hostels" className="inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground mb-2 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Back to Halls Overview
          </Link>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
              <CalendarCheck className="w-7 h-7 text-primary" />
              Bedspace Allocations & Porter Desk
            </h1>
            <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5 border-primary/20 text-primary bg-primary/5">
              Digital Clearance
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Track student check-in status, key issuance, inventory logs, and printable room allocation passes.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/dashboard/hostels/booking">
            <Button className="rounded-xl text-xs sm:text-sm h-10 shadow-sm">
              <Bed className="w-4 h-4 mr-2" />
              Book Bedspace
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search student, matric, room, or ref..." 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
            className="pl-10 h-10 rounded-xl"
          />
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Select value={hostelFilter} onValueChange={setHostelFilter}>
            <SelectTrigger className="w-[180px] h-10 rounded-xl text-xs">
              <SelectValue placeholder="All Halls" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Halls</SelectItem>
              {hostels.map(h => (
                <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px] h-10 rounded-xl text-xs">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="ALLOCATED">Allocated (Pending)</SelectItem>
              <SelectItem value="CHECKED_IN">Checked In</SelectItem>
              <SelectItem value="CHECKED_OUT">Checked Out</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Allocations Table */}
      <Card className="rounded-2xl border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="font-bold text-xs uppercase tracking-wider">Ref #</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider">Student & Program</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider">Hall & Bedspace</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider">Key Tag</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider">Status</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider">Date</TableHead>
                <TableHead className="text-right font-bold text-xs uppercase tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(alloc => {
                const student = alloc.studentProfile?.user || alloc.student;
                const matric = alloc.studentProfile?.matricNumber || alloc.student?.studentId;
                const program = alloc.studentProfile?.program?.name || 'General';

                return (
                  <TableRow key={alloc.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell className="font-mono text-xs font-bold text-foreground">
                      {alloc.allocationRef}
                    </TableCell>

                    <TableCell>
                      <div className="font-semibold text-sm text-foreground">
                        {student ? `${student.firstName} ${student.lastName}` : 'Unlinked Student'}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {matric || 'NO MATRIC'} • {program}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="font-semibold text-xs text-foreground">
                        {alloc.hostel.name}
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        <span className="font-bold text-primary">Room {alloc.room.roomNumber}</span>
                        <span>•</span>
                        <span>{alloc.bedSpace.bedNumber}</span>
                      </div>
                    </TableCell>

                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {alloc.keyTag ? (
                        <span className="flex items-center gap-1">
                          <Key className="w-3 h-3 text-amber-500" /> {alloc.keyTag}
                        </span>
                      ) : (
                        <span className="italic text-[11px]">Not issued</span>
                      )}
                    </TableCell>

                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={`text-[10px] font-bold px-2 py-0.5 ${
                          alloc.status === 'CHECKED_IN' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                          alloc.status === 'ALLOCATED' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                          'bg-slate-500/10 text-slate-600 border-slate-500/20'
                        }`}
                      >
                        {alloc.status === 'CHECKED_IN' ? 'Checked In' :
                         alloc.status === 'ALLOCATED' ? 'Allocated' : 'Vacated'}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {new Date(alloc.allocatedAt).toLocaleDateString()}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => setSelectedSlip(alloc)}
                          className="h-8 px-2.5 text-xs rounded-xl"
                          title="Print Digital Slip"
                        >
                          <Printer className="w-3.5 h-3.5 mr-1 text-primary" />
                          Slip
                        </Button>

                        {alloc.status === 'ALLOCATED' && (
                          <Button 
                            size="sm" 
                            variant="default" 
                            onClick={() => {
                              setSelectedAllocForCheckIn(alloc);
                              setCheckInKeyTag(alloc.keyTag || `KEY-${alloc.room.roomNumber}`);
                            }}
                            className="h-8 px-2.5 text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <LogIn className="w-3.5 h-3.5 mr-1" />
                            Check-In
                          </Button>
                        )}

                        {alloc.status === 'CHECKED_IN' && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => setSelectedAllocForCheckOut(alloc)}
                            className="h-8 px-2.5 text-xs rounded-xl border-rose-500/30 text-rose-600 hover:bg-rose-500/10"
                          >
                            <LogOut className="w-3.5 h-3.5 mr-1" />
                            Check-Out
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}

              {filtered.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground text-xs">
                    No allocation passes match the search filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Check In Modal */}
      <Dialog open={!!selectedAllocForCheckIn} onOpenChange={open => !open && setSelectedAllocForCheckIn(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <LogIn className="w-5 h-5 text-emerald-600" /> Hall Porter Check-In
            </DialogTitle>
            <DialogDescription>
              Confirm arrival, verify identity, and record room key tag issuance.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="p-3 bg-muted/40 rounded-xl text-xs space-y-1">
              <p className="font-bold text-foreground">
                {selectedAllocForCheckIn?.studentProfile?.user?.firstName} {selectedAllocForCheckIn?.studentProfile?.user?.lastName}
              </p>
              <p className="font-mono text-muted-foreground">
                {selectedAllocForCheckIn?.studentProfile?.matricNumber} • Room {selectedAllocForCheckIn?.room?.roomNumber}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Porter / Officer Name</Label>
              <Input value={checkInPorter} onChange={e => setCheckInPorter(e.target.value)} required />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Room Key Tag #</Label>
              <Input value={checkInKeyTag} onChange={e => setCheckInKeyTag(e.target.value)} required />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Inventory Checklist</Label>
              <Textarea value={checkInInventory} onChange={e => setCheckInInventory(e.target.value)} rows={2} />
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => setSelectedAllocForCheckIn(null)}>Cancel</Button>
              <Button onClick={handleConfirmCheckIn} disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {isPending ? 'Processing...' : 'Confirm Check-In'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Check Out Modal */}
      <Dialog open={!!selectedAllocForCheckOut} onOpenChange={open => !open && setSelectedAllocForCheckOut(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <LogOut className="w-5 h-5 text-rose-600" /> Room Vacation & Key Return
            </DialogTitle>
            <DialogDescription>
              Record student room checkout, key surrender, and inventory clearance notes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Inspecting Porter</Label>
              <Input value={checkOutPorter} onChange={e => setCheckOutPorter(e.target.value)} required />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Clearance Inspection Remarks</Label>
              <Textarea value={checkOutClearance} onChange={e => setCheckOutClearance(e.target.value)} rows={3} />
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => setSelectedAllocForCheckOut(null)}>Cancel</Button>
              <Button onClick={handleConfirmCheckOut} disabled={isPending} className="bg-rose-600 hover:bg-rose-700 text-white">
                {isPending ? 'Checking Out...' : 'Complete Check-Out'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Printable Digital Slip Dialog */}
      <Dialog open={!!selectedSlip} onOpenChange={open => !open && setSelectedSlip(null)}>
        <DialogContent className="max-w-xl p-0 overflow-hidden bg-white text-slate-900 border-none shadow-2xl">
          {selectedSlip && (
            <div className="p-6 space-y-6">
              {/* Slip Header */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-6 h-6 text-indigo-700" />
                    <span className="font-extrabold text-lg text-slate-900 tracking-tight">STUDENT AFFAIRS DIVISION</span>
                  </div>
                  <p className="text-xs text-slate-600 font-semibold mt-0.5">Hall Accommodation & Residency Pass</p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs font-bold text-indigo-700 block">{selectedSlip.allocationRef}</span>
                  <Badge className="bg-emerald-600 text-white text-[10px] uppercase font-bold mt-1">
                    {selectedSlip.status}
                  </Badge>
                </div>
              </div>

              {/* Student Demographics Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Student Beneficiary</span>
                  <p className="text-sm font-bold text-slate-900">
                    {selectedSlip.studentProfile?.user?.firstName} {selectedSlip.studentProfile?.user?.lastName}
                  </p>
                  <p className="font-mono text-slate-600 mt-0.5">{selectedSlip.studentProfile?.matricNumber}</p>
                  <p className="text-slate-500">{selectedSlip.studentProfile?.program?.name}</p>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Residence Assignment</span>
                  <p className="text-sm font-bold text-indigo-900">{selectedSlip.hostel.name}</p>
                  <p className="font-bold text-slate-800 mt-0.5">
                    Room {selectedSlip.room.roomNumber} • {selectedSlip.bedSpace.bedNumber}
                  </p>
                  <p className="font-mono text-slate-600">Key Tag: {selectedSlip.keyTag || 'Issued upon arrival'}</p>
                </div>
              </div>

              {/* Inventory & Guidelines */}
              <div className="text-xs space-y-2 border-t border-slate-200 pt-3">
                <p className="font-bold text-slate-800">Inventory & Residence Rules:</p>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  {selectedSlip.inventoryNotes || 'Mattress, wardrobe key, and study station issued in good condition.'}
                </p>
                <ul className="list-disc pl-4 text-[10px] text-slate-500 space-y-0.5">
                  <li>Cooking with non-approved heating coils inside bedrooms is strictly prohibited.</li>
                  <li>Visitors are strictly restricted to the common room beyond official visiting hours.</li>
                  <li>Room key must be surrendered upon semester checkout or graduation clearance.</li>
                </ul>
              </div>

              {/* Security QR Token & Signatures */}
              <div className="flex justify-between items-end border-t border-slate-200 pt-4 text-xs">
                <div>
                  <p className="font-mono text-[10px] text-slate-500">Cryptographic Porter Token:</p>
                  <p className="font-mono font-bold text-slate-900 text-xs">{selectedSlip.qrToken || 'TOKEN-VERIFIED'}</p>
                  <p className="text-[10px] text-slate-400 mt-1">Issued: {new Date(selectedSlip.allocatedAt).toLocaleString()}</p>
                </div>

                <div className="text-right">
                  <div className="w-36 border-b border-slate-400 mb-1"></div>
                  <span className="text-[10px] font-bold text-slate-700 block">Hall Warden / Porter Signature</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 print:hidden">
                <Button variant="outline" onClick={() => setSelectedSlip(null)} className="text-xs">
                  Close
                </Button>
                <Button onClick={() => window.print()} className="bg-indigo-700 hover:bg-indigo-800 text-white text-xs">
                  <Printer className="w-3.5 h-3.5 mr-1" /> Print Slip
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
