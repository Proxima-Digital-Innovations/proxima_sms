'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Building2, 
  Bed, 
  DoorClosed, 
  Users, 
  PlusCircle, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  ShieldCheck, 
  Phone, 
  Mail, 
  MapPin, 
  Search, 
  Filter, 
  Compass,
  CalendarCheck,
  UserCheck
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { getHostelsSummary, getHostelsList, createHostel } from '@/actions/hostel-actions';

export default function HostelsDashboardPage() {
  const [summary, setSummary] = useState<any>(null);
  const [hostels, setHostels] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState('ALL');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  // Create Form State
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formGender, setFormGender] = useState('MIXED');
  const [formCategory, setFormCategory] = useState('UNDERGRADUATE');
  const [formDescription, setFormDescription] = useState('');
  const [formWardenName, setFormWardenName] = useState('');
  const [formWardenPhone, setFormWardenPhone] = useState('');
  const [formWardenEmail, setFormWardenEmail] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [sumRes, listRes] = await Promise.all([
        getHostelsSummary(),
        getHostelsList(),
      ]);

      if (sumRes.success) setSummary(sumRes.data);
      if (listRes.success) setHostels(listRes.data || []);
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Network Error',
        description: 'Failed to fetch hostel data.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCode.trim()) {
      toast({ title: 'Validation Error', description: 'Name and Code are required.', variant: 'destructive' });
      return;
    }

    startTransition(async () => {
      const res = await createHostel({
        name: formName,
        code: formCode,
        gender: formGender,
        category: formCategory,
        description: formDescription,
        wardenName: formWardenName,
        wardenPhone: formWardenPhone,
        wardenEmail: formWardenEmail,
      });

      if (res.success) {
        toast({
          title: 'Hall Created',
          description: `Hostel ${formName} was registered successfully.`,
        });
        setIsCreateOpen(false);
        setFormName('');
        setFormCode('');
        setFormDescription('');
        setFormWardenName('');
        setFormWardenPhone('');
        setFormWardenEmail('');
        loadData();
      } else {
        toast({
          title: 'Creation Failed',
          description: res.error || 'Could not create hostel hall.',
          variant: 'destructive',
        });
      }
    });
  };

  const filteredHostels = hostels.filter(h => {
    const matchesSearch = h.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          h.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGender = genderFilter === 'ALL' || h.gender === genderFilter;
    return matchesSearch && matchesGender;
  });

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full min-w-0">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-background p-5 sm:p-6 rounded-2xl border border-border shadow-sm">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
              <Building2 className="w-7 h-7 text-primary" />
              Hostels & Student Accommodation
            </h1>
            <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5 border-primary/20 text-primary bg-primary/5">
              TIMS Facilities
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Halls of residence, real-time bedspace inventory, gender segregation, and porter check-in clearance.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link href="/dashboard/hostels/allocations">
            <Button variant="outline" className="border-border rounded-xl text-xs sm:text-sm h-10">
              <CalendarCheck className="w-4 h-4 mr-2 text-indigo-500" />
              Allocation Passes
            </Button>
          </Link>
          <Link href="/dashboard/hostels/booking">
            <Button variant="outline" className="border-border rounded-xl text-xs sm:text-sm h-10">
              <Bed className="w-4 h-4 mr-2 text-emerald-500" />
              Student Booking
            </Button>
          </Link>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs sm:text-sm shadow-md h-10">
                <PlusCircle className="w-4 h-4 mr-2" />
                Add Hostel Hall
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" /> Register New Hall of Residence
                </DialogTitle>
                <DialogDescription>
                  Configure a new student residence, specify gender affiliation, and designate hall warden details.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleCreate} className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Hall Name *</Label>
                    <Input 
                      placeholder="e.g. Prof. Kenneth Dike Hall" 
                      value={formName} 
                      onChange={e => setFormName(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Hall Code *</Label>
                    <Input 
                      placeholder="e.g. HL-DIKE" 
                      value={formCode} 
                      onChange={e => setFormCode(e.target.value.toUpperCase())} 
                      required 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Gender Affiliation *</Label>
                    <Select value={formGender} onValueChange={setFormGender}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MALE">Male Residence</SelectItem>
                        <SelectItem value="FEMALE">Female Residence</SelectItem>
                        <SelectItem value="MIXED">Mixed / Executive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Category</Label>
                    <Select value={formCategory} onValueChange={setFormCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UNDERGRADUATE">Undergraduate</SelectItem>
                        <SelectItem value="POSTGRADUATE">Postgraduate / Clinical</SelectItem>
                        <SelectItem value="BASIC_BOARDING">Basic Boarding</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Description & Facilities</Label>
                  <Textarea 
                    placeholder="e.g. Features quiet study rooms, solar water heating, and 24/7 security turnstiles..." 
                    value={formDescription} 
                    onChange={e => setFormDescription(e.target.value)} 
                    rows={2}
                  />
                </div>

                <div className="border-t border-border/80 pt-3">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Hall Warden In-Charge</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[11px]">Warden Name</Label>
                      <Input 
                        placeholder="Dr. Full Name" 
                        value={formWardenName} 
                        onChange={e => setFormWardenName(e.target.value)} 
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Phone</Label>
                      <Input 
                        placeholder="+234..." 
                        value={formWardenPhone} 
                        onChange={e => setFormWardenPhone(e.target.value)} 
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Email</Label>
                      <Input 
                        placeholder="warden@..." 
                        value={formWardenEmail} 
                        onChange={e => setFormWardenEmail(e.target.value)} 
                      />
                    </div>
                  </div>
                </div>

                <DialogFooter className="pt-3">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? 'Saving...' : 'Establish Hall'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* High-Impact Telemetry Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="rounded-2xl border-border/80 bg-card/80 backdrop-blur-sm p-4 sm:p-5 relative overflow-hidden">
            <div className="flex items-center justify-between pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Active Halls</span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-foreground">
              {isLoading ? '...' : (summary?.totalHostels || 0)}
            </div>
            <div className="text-xs text-muted-foreground mt-1 font-medium">
              Across {summary?.totalRooms || 0} active rooms
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="rounded-2xl border-border/80 bg-card/80 backdrop-blur-sm p-4 sm:p-5 relative overflow-hidden">
            <div className="flex items-center justify-between pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total Bedspaces</span>
              <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600">
                <Bed className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-foreground">
              {isLoading ? '...' : (summary?.totalBeds || 0).toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground mt-1 font-medium">
              {summary?.availableBeds || 0} vacancies available
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="rounded-2xl border-border/80 bg-card/80 backdrop-blur-sm p-4 sm:p-5 relative overflow-hidden">
            <div className="flex items-center justify-between pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Occupancy Rate</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-foreground">
              {isLoading ? '...' : `${summary?.occupancyRate || 0}%`}
            </div>
            <div className="text-xs text-muted-foreground mt-1 font-medium flex items-center gap-1">
              <span className="text-emerald-600 font-bold">{summary?.occupiedBeds || 0}</span> students housed
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="rounded-2xl border-border/80 bg-card/80 backdrop-blur-sm p-4 sm:p-5 relative overflow-hidden">
            <div className="flex items-center justify-between pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Gender Capacity</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-sm font-bold text-foreground space-y-1 mt-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-blue-600 font-semibold">Male Beds:</span>
                <span className="font-mono">{summary?.maleOccupiedBeds || 0} / {summary?.maleTotalBeds || 0}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-pink-600 font-semibold">Female Beds:</span>
                <span className="font-mono">{summary?.femaleOccupiedBeds || 0} / {summary?.femaleTotalBeds || 0}</span>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search hall name or code..." 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
            className="pl-10 h-10 rounded-xl"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select value={genderFilter} onValueChange={setGenderFilter}>
            <SelectTrigger className="w-[170px] h-10 rounded-xl text-xs">
              <SelectValue placeholder="All Genders" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Genders</SelectItem>
              <SelectItem value="MALE">Male Halls Only</SelectItem>
              <SelectItem value="FEMALE">Female Halls Only</SelectItem>
              <SelectItem value="MIXED">Mixed / Executive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Halls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredHostels.map((hostel, index) => (
          <motion.div
            key={hostel.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
          >
            <Card className="rounded-2xl border-border bg-card/90 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between overflow-hidden group">
              <div>
                <CardHeader className="p-5 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <Badge 
                      variant="outline" 
                      className={`text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider ${
                        hostel.gender === 'MALE' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                        hostel.gender === 'FEMALE' ? 'bg-pink-500/10 text-pink-600 border-pink-500/20' :
                        'bg-violet-500/10 text-violet-600 border-violet-500/20'
                      }`}
                    >
                      {hostel.gender === 'MALE' ? 'Male Residence' : hostel.gender === 'FEMALE' ? 'Female Residence' : 'Mixed / Executive'}
                    </Badge>
                    <span className="font-mono text-xs font-bold text-muted-foreground">{hostel.code}</span>
                  </div>

                  <CardTitle className="text-lg font-bold text-foreground mt-2 line-clamp-1 group-hover:text-primary transition-colors">
                    {hostel.name}
                  </CardTitle>
                  <CardDescription className="text-xs line-clamp-2 mt-1">
                    {hostel.description || 'Modern institutional residential facility.'}
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-5 pt-1 space-y-4">
                  {/* Occupancy Progress */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-medium">
                      <span className="text-muted-foreground">Occupancy</span>
                      <span className="font-mono font-bold text-foreground">
                        {hostel.occupiedBedSpaces} / {hostel.totalBedSpaces} Beds ({hostel.occupancyPercentage}%)
                      </span>
                    </div>
                    <Progress value={hostel.occupancyPercentage} className="h-2 rounded-full" />
                  </div>

                  {/* Quick specs */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 bg-muted/40 rounded-xl text-center border border-border/60">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">Blocks</span>
                      <span className="text-sm font-bold text-foreground">{hostel.blocksCount}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">Rooms</span>
                      <span className="text-sm font-bold text-foreground">{hostel.roomsCount}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">Vacant</span>
                      <span className="text-sm font-bold text-emerald-600">{hostel.availableBedSpaces}</span>
                    </div>
                  </div>

                  {/* Warden snippet */}
                  {hostel.wardenName && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                      <UserCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="truncate">Warden: <strong className="text-foreground">{hostel.wardenName}</strong></span>
                    </div>
                  )}
                </CardContent>
              </div>

              <div className="p-4 pt-0 border-t border-border/40 mt-2 bg-muted/10">
                <Link href={`/dashboard/hostels/${hostel.id}`} className="w-full">
                  <Button variant="default" className="w-full mt-3 rounded-xl text-xs font-semibold h-9 flex items-center justify-center gap-1.5">
                    Manage Rooms & Beds
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </Card>
          </motion.div>
        ))}

        {filteredHostels.length === 0 && !isLoading && (
          <div className="col-span-full py-16 text-center border border-dashed border-border rounded-2xl p-6 bg-muted/20">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <h3 className="font-bold text-lg text-foreground">No Hostels Found</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              No hostel hall matches your search criteria. Create a new hall or reset your filters.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
