'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Building2, 
  Bed, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  CreditCard, 
  ShieldCheck, 
  FileText, 
  Check, 
  ArrowRight,
  Phone,
  Printer
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useSession } from 'next-auth/react';
import { getAvailableBedspacesForBooking, allocateBedspace } from '@/actions/hostel-actions';

export default function StudentHostelBookingPage() {
  const { data: session } = useSession();
  const [hostels, setHostels] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  // Selection State
  const [selectedHostel, setSelectedHostel] = useState<any>(null);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [selectedBed, setSelectedBed] = useState<any>(null);
  const [agreedToRules, setAgreedToRules] = useState(false);
  const [bookingSuccessData, setBookingSuccessData] = useState<any>(null);

  const loadAvailableHalls = async () => {
    setIsLoading(true);
    try {
      const res = await getAvailableBedspacesForBooking();
      if (res.success) {
        setHostels(res.data || []);
        if (res.data && res.data.length > 0) {
          setSelectedHostel(res.data[0]);
        }
      }
    } catch (err: any) {
      toast({ title: 'Error', description: 'Failed to fetch accommodation inventory.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAvailableHalls();
  }, []);

  const handleConfirmReservation = async () => {
    if (!selectedBed || !selectedRoom || !selectedHostel) {
      toast({ title: 'Incomplete Selection', description: 'Please select a hall, room, and bedspace.', variant: 'destructive' });
      return;
    }
    if (!agreedToRules) {
      toast({ title: 'Agreement Required', description: 'Please acknowledge the institutional residence rules.', variant: 'destructive' });
      return;
    }

    startTransition(async () => {
      // Find logged in student's profileId or fallback
      const studentProfileId = (session?.user as any)?.studentProfileId || null;

      const res = await allocateBedspace({
        hostelId: selectedHostel.id,
        roomId: selectedRoom.id,
        bedSpaceId: selectedBed.id,
        studentProfileId,
        inventoryNotes: 'Self-service reserved via student portal.',
      });

      if (res.success) {
        setBookingSuccessData({
          allocationRef: res.data.allocationRef,
          hostelName: selectedHostel.name,
          roomNumber: selectedRoom.roomNumber,
          bedNumber: selectedBed.bedNumber,
          fee: selectedRoom.feePerSession,
          qrToken: res.data.qrToken,
        });
        toast({ title: 'Reservation Confirmed', description: 'Your bedspace has been secured.' });
      } else {
        toast({ title: 'Allocation Failed', description: res.error, variant: 'destructive' });
      }
    });
  };

  if (bookingSuccessData) {
    return (
      <div className="max-w-2xl mx-auto py-10 px-4 animate-in zoom-in-95 duration-300">
        <Card className="rounded-3xl border-emerald-500/30 bg-card shadow-2xl p-6 sm:p-8 text-center relative overflow-hidden">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">Bedspace Secured!</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Your accommodation booking has been validated and cryptographically recorded.
          </p>

          <div className="my-6 p-5 bg-muted/40 rounded-2xl border border-border text-left space-y-3">
            <div className="flex justify-between items-center text-xs pb-2 border-b border-border/80">
              <span className="text-muted-foreground">Allocation Reference</span>
              <span className="font-mono font-bold text-foreground">{bookingSuccessData.allocationRef}</span>
            </div>
            <div className="flex justify-between items-center text-xs pb-2 border-b border-border/80">
              <span className="text-muted-foreground">Residence Hall</span>
              <span className="font-bold text-primary">{bookingSuccessData.hostelName}</span>
            </div>
            <div className="flex justify-between items-center text-xs pb-2 border-b border-border/80">
              <span className="text-muted-foreground">Assigned Room & Bed</span>
              <span className="font-bold text-foreground">
                Room {bookingSuccessData.roomNumber} • {bookingSuccessData.bedNumber}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Session Accommodation Fee</span>
              <span className="font-mono font-bold text-emerald-600">₦{bookingSuccessData.fee.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link href="/dashboard/hostels/allocations">
              <Button className="w-full sm:w-auto rounded-xl">
                <Printer className="w-4 h-4 mr-2" />
                View & Print Pass Slip
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" className="w-full sm:w-auto rounded-xl">
                Return to Dashboard
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300 w-full max-w-5xl mx-auto min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-background p-5 sm:p-6 rounded-2xl border border-border shadow-sm">
        <div>
          <Link href="/dashboard/hostels" className="inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground mb-2 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Back to Halls Overview
          </Link>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
              <Bed className="w-7 h-7 text-primary" />
              Student Bedspace Reservation
            </h1>
            <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5 border-emerald-500/20 text-emerald-600 bg-emerald-500/5">
              Self-Service Portal
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Browse available halls of residence, inspect room occupancy, and reserve your designated bedspace.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="h-28 bg-muted rounded-2xl animate-pulse"></div>
          <div className="h-64 bg-muted rounded-2xl animate-pulse"></div>
        </div>
      ) : hostels.length === 0 ? (
        <Card className="rounded-2xl p-12 text-center border-dashed border-border bg-muted/20">
          <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
          <h3 className="text-lg font-bold text-foreground">No Vacancies Currently Available</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            All rooms in the accommodation pool have either reached capacity or have not yet opened for general reservation.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Step 1: Select Hall (Left Column) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center">1</span>
              <h2 className="text-base font-bold text-foreground">Select Hall of Residence</h2>
            </div>

            <div className="space-y-3">
              {hostels.map(h => {
                const isSelected = selectedHostel?.id === h.id;
                return (
                  <Card 
                    key={h.id}
                    onClick={() => {
                      setSelectedHostel(h);
                      setSelectedRoom(null);
                      setSelectedBed(null);
                    }}
                    className={`rounded-2xl p-4 cursor-pointer transition-all border ${
                      isSelected 
                        ? 'border-primary shadow-md bg-primary/5 ring-1 ring-primary' 
                        : 'border-border hover:border-border/80 bg-card'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Badge 
                          variant="outline" 
                          className={`text-[9px] font-bold px-1.5 py-0 uppercase tracking-wider ${
                            h.gender === 'MALE' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                            h.gender === 'FEMALE' ? 'bg-pink-500/10 text-pink-600 border-pink-500/20' :
                            'bg-violet-500/10 text-violet-600 border-violet-500/20'
                          }`}
                        >
                          {h.gender} Residence
                        </Badge>
                        <h3 className="font-bold text-sm text-foreground mt-1.5">{h.name}</h3>
                        <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{h.description}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-emerald-600 font-mono">
                          {h.rooms.reduce((acc: number, r: any) => acc + r.availableBedsCount, 0)} Vacancies
                        </span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Step 2 & 3: Select Room and Bedspace (Right Column) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center">2</span>
              <h2 className="text-base font-bold text-foreground">
                Select Room & Bed ({selectedHostel?.name})
              </h2>
            </div>

            {selectedHostel ? (
              <div className="space-y-4">
                {/* Available Rooms in Selected Hall */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {selectedHostel.rooms.map((room: any) => {
                    const isSelected = selectedRoom?.id === room.id;
                    return (
                      <div
                        key={room.id}
                        onClick={() => {
                          setSelectedRoom(room);
                          setSelectedBed(null);
                        }}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all text-left ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-500/10 shadow-sm ring-1 ring-indigo-600'
                            : 'border-border bg-card hover:bg-muted/40'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-sm text-foreground">Room {room.roomNumber}</span>
                          <span className="text-[10px] text-muted-foreground">Fl. {room.floor}</span>
                        </div>
                        <p className="text-[11px] font-bold text-emerald-600 font-mono">
                          ₦{(room.feePerSession || 0).toLocaleString()}
                        </p>
                        <span className="text-[10px] text-muted-foreground mt-1 block">
                          {room.availableBedsCount} bed{room.availableBedsCount > 1 ? 's' : ''} free
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Available Bedspaces in Selected Room */}
                {selectedRoom && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-5 bg-card border border-border rounded-2xl space-y-4 shadow-sm">
                    <div>
                      <h3 className="font-bold text-sm text-foreground">
                        Step 3: Select Bed Position in Room {selectedRoom.roomNumber}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Choose your preferred bunk or space position.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedRoom.beds.map((bed: any) => {
                        const isBedSelected = selectedBed?.id === bed.id;
                        return (
                          <div
                            key={bed.id}
                            onClick={() => setSelectedBed(bed)}
                            className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                              isBedSelected
                                ? 'border-emerald-600 bg-emerald-500/10 ring-1 ring-emerald-600'
                                : 'border-border/80 hover:bg-muted/50'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Bed className={`w-4 h-4 ${isBedSelected ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                              <span className="text-xs font-semibold text-foreground">{bed.bedNumber}</span>
                            </div>
                            {isBedSelected && <Check className="w-4 h-4 text-emerald-600" />}
                          </div>
                        );
                      })}
                    </div>

                    {/* Terms & Confirmation */}
                    <div className="pt-3 border-t border-border/80 space-y-3">
                      <div className="flex items-start gap-2">
                        <Checkbox 
                          id="terms" 
                          checked={agreedToRules} 
                          onCheckedChange={checked => setAgreedToRules(Boolean(checked))} 
                          className="mt-0.5"
                        />
                        <Label htmlFor="terms" className="text-xs leading-relaxed text-muted-foreground cursor-pointer">
                          I agree to abide by the institution's residence hall regulations, maintain electrical/furniture fittings, and surrender my room key upon checkout.
                        </Label>
                      </div>

                      <Button
                        onClick={handleConfirmReservation}
                        disabled={!selectedBed || !agreedToRules || isPending}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11 font-semibold text-xs sm:text-sm shadow-md"
                      >
                        {isPending ? 'Securing Bedspace...' : `Confirm Reservation • ₦${(selectedRoom.feePerSession || 0).toLocaleString()}`}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center border border-dashed border-border rounded-2xl text-xs text-muted-foreground">
                Select a hall from the left to view available rooms.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
