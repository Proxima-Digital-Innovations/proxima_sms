'use client';

import { useEffect, useState, useTransition, use } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Building2, 
  Bed, 
  DoorClosed, 
  Users, 
  PlusCircle, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  UserCheck, 
  UserPlus, 
  Key, 
  LogOut, 
  Search, 
  Layers, 
  Sparkles,
  Phone,
  Mail,
  ShieldAlert
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { 
  getHostelDetails, 
  createRoomsBatch, 
  allocateBedspace, 
  checkOutStudent, 
  getStudentsForAllocationSearch 
} from '@/actions/hostel-actions';

export default function HostelDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const hostelId = resolvedParams.id;

  const [hostel, setHostel] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  // Filters
  const [floorFilter, setFloorFilter] = useState('ALL');
  const [searchRoom, setSearchRoom] = useState('');

  // Batch Room Modal
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [batchBlock, setBatchBlock] = useState('Block A');
  const [batchFloor, setBatchFloor] = useState(1);
  const [batchPrefix, setBatchPrefix] = useState('A');
  const [batchStartNum, setBatchStartNum] = useState(101);
  const [batchCount, setBatchCount] = useState(6);
  const [batchCapacity, setBatchCapacity] = useState(4);
  const [batchFee, setBatchFee] = useState(45000);
  const [batchType, setBatchType] = useState('STANDARD');

  // Allocate Modal
  const [selectedBed, setSelectedBed] = useState<any>(null);
  const [isAllocateOpen, setIsAllocateOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentResults, setStudentResults] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [allocKeyTag, setAllocKeyTag] = useState('');
  const [allocInventory, setAllocInventory] = useState('Mattress, study table, and wardrobe key verified in good condition.');

  const loadDetails = async () => {
    setIsLoading(true);
    try {
      const res = await getHostelDetails(hostelId);
      if (res.success) {
        setHostel(res.data);
      } else {
        toast({ title: 'Error', description: res.error, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: 'Failed to fetch hall details', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [hostelId]);

  // Search students when typing
  useEffect(() => {
    if (studentSearch.trim().length >= 2) {
      getStudentsForAllocationSearch(studentSearch).then(res => {
        if (res.success) setStudentResults(res.data || []);
      });
    } else {
      setStudentResults([]);
    }
  }, [studentSearch]);

  const handleBatchCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await createRoomsBatch({
        hostelId,
        blockName: batchBlock,
        floor: Number(batchFloor),
        prefix: batchPrefix,
        startNum: Number(batchStartNum),
        count: Number(batchCount),
        capacity: Number(batchCapacity),
        feePerSession: Number(batchFee),
        type: batchType,
      });

      if (res.success) {
        toast({ title: 'Rooms Generated', description: `Successfully created ${res.count} rooms with bedspaces.` });
        setIsBatchOpen(false);
        loadDetails();
      } else {
        toast({ title: 'Generation Failed', description: res.error, variant: 'destructive' });
      }
    });
  };

  const openAllocateModal = (room: any, bed: any) => {
    setSelectedBed({ room, bed });
    setSelectedStudent(null);
    setStudentSearch('');
    setStudentResults([]);
    setAllocKeyTag(`KEY-${room.roomNumber}-${bed.bedNumber.replace(/\D/g, '') || '1'}`);
    setIsAllocateOpen(true);
  };

  const handleConfirmAllocation = async () => {
    if (!selectedStudent) {
      toast({ title: 'Selection Missing', description: 'Please select an enrolled student to allocate.', variant: 'destructive' });
      return;
    }

    startTransition(async () => {
      const res = await allocateBedspace({
        hostelId,
        roomId: selectedBed.room.id,
        bedSpaceId: selectedBed.bed.id,
        studentProfileId: selectedStudent.id,
        keyTag: allocKeyTag,
        inventoryNotes: allocInventory,
      });

      if (res.success) {
        toast({ title: 'Bed Allocated', description: `Allocated to ${selectedStudent.name} (${selectedStudent.matricNumber}).` });
        setIsAllocateOpen(false);
        loadDetails();
      } else {
        toast({ title: 'Allocation Failed', description: res.error, variant: 'destructive' });
      }
    });
  };

  const handleCheckOut = async (allocationId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to check out ${studentName}? This will free the bedspace.`)) return;

    startTransition(async () => {
      const res = await checkOutStudent(allocationId, {
        porterName: 'Hall Porter Desk',
        clearanceNotes: 'Key returned and fixtures inspected on checkout.',
      });

      if (res.success) {
        toast({ title: 'Checked Out', description: 'Student checked out and bedspace returned to vacancy pool.' });
        loadDetails();
      } else {
        toast({ title: 'Check Out Failed', description: res.error, variant: 'destructive' });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-muted rounded-xl animate-pulse"></div>
        <div className="h-40 bg-muted rounded-2xl animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-56 bg-muted rounded-2xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!hostel) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Hostel hall not found.</p>
        <Link href="/dashboard/hostels">
          <Button variant="outline" className="mt-4">Back to Hostels</Button>
        </Link>
      </div>
    );
  }

  const floors = Array.from(new Set(hostel.rooms.map((r: any) => r.floor))).sort((a: any, b: any) => a - b);

  const filteredRooms = hostel.rooms.filter((r: any) => {
    const matchesFloor = floorFilter === 'ALL' || String(r.floor) === floorFilter;
    const matchesSearch = r.roomNumber.toLowerCase().includes(searchRoom.toLowerCase());
    return matchesFloor && matchesSearch;
  });

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300 w-full min-w-0">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-background p-5 sm:p-6 rounded-2xl border border-border shadow-sm">
        <div>
          <Link href="/dashboard/hostels" className="inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground mb-2 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Back to Halls Overview
          </Link>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">{hostel.name}</h1>
            <Badge 
              variant="outline" 
              className={`text-xs font-bold px-2.5 py-0.5 ${
                hostel.gender === 'MALE' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                hostel.gender === 'FEMALE' ? 'bg-pink-500/10 text-pink-600 border-pink-500/20' :
                'bg-violet-500/10 text-violet-600 border-violet-500/20'
              }`}
            >
              {hostel.gender === 'MALE' ? 'Male Residence' : hostel.gender === 'FEMALE' ? 'Female Residence' : 'Mixed / Executive'}
            </Badge>
            <span className="font-mono text-xs text-muted-foreground font-semibold">({hostel.code})</span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {hostel.description || 'Facility room inventory, bunk positions, and real-time student allocations.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button onClick={() => setIsBatchOpen(true)} className="rounded-xl text-xs sm:text-sm h-10 shadow-sm">
            <PlusCircle className="w-4 h-4 mr-2" />
            Batch Add Rooms
          </Button>
        </div>
      </div>

      {/* Hall Warden & Contact Details */}
      {hostel.wardenName && (
        <div className="p-4 bg-muted/30 border border-border/80 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-foreground">Hall Warden: {hostel.wardenName}</span>
              <p className="text-muted-foreground text-[11px]">Responsible for hall discipline, safety, and inventory.</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-muted-foreground font-mono">
            {hostel.wardenPhone && (
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-primary" /> {hostel.wardenPhone}
              </span>
            )}
            {hostel.wardenEmail && (
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-primary" /> {hostel.wardenEmail}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Search & Floor Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search room (e.g. A101)..." 
            value={searchRoom} 
            onChange={e => setSearchRoom(e.target.value)} 
            className="pl-10 h-10 rounded-xl"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">Floor:</span>
          <Select value={floorFilter} onValueChange={setFloorFilter}>
            <SelectTrigger className="w-[140px] h-10 rounded-xl text-xs">
              <SelectValue placeholder="All Floors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Floors</SelectItem>
              {floors.map((f: any) => (
                <SelectItem key={f} value={String(f)}>Floor {f === 0 ? 'Ground' : f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredRooms.map((room: any) => {
          const occupiedCount = room.bedSpaces.filter((b: any) => b.isOccupied).length;
          const isFull = occupiedCount >= room.capacity;

          return (
            <Card key={room.id} className="rounded-2xl border-border bg-card shadow-sm hover:border-border transition-colors flex flex-col justify-between overflow-hidden">
              <CardHeader className="p-4 sm:p-5 pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-muted text-foreground font-mono font-bold text-sm">
                      {room.roomNumber}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-foreground">
                        {room.block?.name || 'Block A'} • Floor {room.floor}
                      </span>
                      <p className="text-[11px] text-muted-foreground">
                        {room.type} • ₦{(room.feePerSession || 0).toLocaleString()} / session
                      </p>
                    </div>
                  </div>

                  <Badge 
                    variant="outline" 
                    className={`text-[10px] font-bold px-2 py-0.5 ${
                      isFull ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' :
                      occupiedCount > 0 ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                      'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                    }`}
                  >
                    {isFull ? 'Full' : `${room.capacity - occupiedCount} Available`}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-4 sm:p-5 pt-2 space-y-2.5">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  Bedspaces ({occupiedCount}/{room.capacity})
                </p>

                <div className="space-y-2">
                  {room.bedSpaces.map((bed: any) => {
                    const activeAlloc = bed.allocations?.[0];
                    const student = activeAlloc?.studentProfile?.user || activeAlloc?.student;
                    const matric = activeAlloc?.studentProfile?.matricNumber || activeAlloc?.student?.studentId;

                    return (
                      <div 
                        key={bed.id} 
                        className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 transition-colors ${
                          bed.isOccupied 
                            ? 'bg-muted/40 border-border/80' 
                            : 'bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Bed className={`w-3.5 h-3.5 shrink-0 ${bed.isOccupied ? 'text-muted-foreground' : 'text-emerald-600'}`} />
                            <span className="font-semibold text-foreground truncate">{bed.bedNumber}</span>
                          </div>

                          {bed.isOccupied && student ? (
                            <div className="mt-1">
                              <p className="font-bold text-primary truncate text-[11px]">
                                {student.firstName} {student.lastName}
                              </p>
                              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
                                <span>{matric || 'NO MATRIC'}</span>
                                <span>•</span>
                                <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5">
                                  {activeAlloc.status}
                                </Badge>
                              </div>
                            </div>
                          ) : (
                            <span className="text-[10px] text-emerald-600 font-medium">Ready for allocation</span>
                          )}
                        </div>

                        <div>
                          {bed.isOccupied ? (
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => handleCheckOut(activeAlloc.id, `${student?.firstName} ${student?.lastName}`)}
                              className="h-7 px-2 text-[11px] text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 rounded-lg"
                              title="Check Out Student"
                            >
                              <LogOut className="w-3 h-3 mr-1" />
                              Vacate
                            </Button>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => openAllocateModal(room, bed)}
                              className="h-7 px-2.5 text-[11px] border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 rounded-lg font-semibold"
                            >
                              <UserPlus className="w-3 h-3 mr-1" />
                              Allocate
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Batch Add Rooms Dialog */}
      <Dialog open={isBatchOpen} onOpenChange={setIsBatchOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-primary" /> Batch Generate Rooms
            </DialogTitle>
            <DialogDescription>
              Scaffold multiple rooms and automatic bunk bedspaces inside this hall at once.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleBatchCreate} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Block Name</Label>
                <Input value={batchBlock} onChange={e => setBatchBlock(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Floor Level (0 = Ground)</Label>
                <Input type="number" min="0" value={batchFloor} onChange={e => setBatchFloor(Number(e.target.value))} required />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Room Prefix</Label>
                <Input placeholder="e.g. A" value={batchPrefix} onChange={e => setBatchPrefix(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Start Number</Label>
                <Input type="number" value={batchStartNum} onChange={e => setBatchStartNum(Number(e.target.value))} required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Number of Rooms</Label>
                <Input type="number" min="1" max="50" value={batchCount} onChange={e => setBatchCount(Number(e.target.value))} required />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Capacity (Beds)</Label>
                <Input type="number" min="1" max="12" value={batchCapacity} onChange={e => setBatchCapacity(Number(e.target.value))} required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Fee (₦ / Session)</Label>
                <Input type="number" step="1000" value={batchFee} onChange={e => setBatchFee(Number(e.target.value))} required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Room Type</Label>
                <Select value={batchType} onValueChange={setBatchType}>
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STANDARD">Standard Bunk</SelectItem>
                    <SelectItem value="EXECUTIVE">Executive Ensuite</SelectItem>
                    <SelectItem value="SPECIAL_NEEDS">Special Needs</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setIsBatchOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{isPending ? 'Generating...' : 'Create Rooms'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bedspace Allocation Dialog */}
      <Dialog open={isAllocateOpen} onOpenChange={setIsAllocateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-600" /> Allocate Bedspace
            </DialogTitle>
            <DialogDescription>
              Assign <strong>{selectedBed?.bed?.bedNumber}</strong> in <strong>Room {selectedBed?.room?.roomNumber}</strong> ({hostel.name}) to an enrolled student.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Search Student */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Search Student (Name or Matric Number) *</Label>
              <Input 
                placeholder="Type matric number or student name..." 
                value={studentSearch} 
                onChange={e => setStudentSearch(e.target.value)} 
              />

              {studentResults.length > 0 && !selectedStudent && (
                <div className="max-h-44 overflow-y-auto border border-border rounded-xl divide-y divide-border bg-card shadow-sm mt-1">
                  {studentResults.map((s: any) => (
                    <div 
                      key={s.id} 
                      onClick={() => {
                        setSelectedStudent(s);
                        setStudentResults([]);
                      }}
                      className="p-2.5 hover:bg-muted/50 cursor-pointer text-xs flex justify-between items-center transition-colors"
                    >
                      <div>
                        <p className="font-bold text-foreground">{s.name}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">{s.matricNumber} • {s.program}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">{s.currentLevel}L</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Student Banner */}
            {selectedStudent && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400 block">Selected Beneficiary</span>
                  <span className="font-bold text-sm text-foreground">{selectedStudent.name}</span>
                  <p className="text-muted-foreground font-mono">{selectedStudent.matricNumber} • {selectedStudent.program}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setSelectedStudent(null)} className="h-7 text-xs text-rose-600">
                  Change
                </Button>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Key Tag Number</Label>
              <Input value={allocKeyTag} onChange={e => setAllocKeyTag(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Inventory Checklist & State Notes</Label>
              <Textarea 
                value={allocInventory} 
                onChange={e => setAllocInventory(e.target.value)} 
                rows={2}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAllocateOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleConfirmAllocation} 
                disabled={!selectedStudent || isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isPending ? 'Allocating...' : 'Confirm Allocation'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
