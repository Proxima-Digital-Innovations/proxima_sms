'use client';

import { useState, useEffect, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  getCampusesWithFaculties,
  createCampusAction,
  createFacultyAction,
  createLectureVenueAction,
} from '@/actions/campus-faculty-actions';
import { Building2, School, MapPin, Users, Plus, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';

export default function CampusFacultyPage() {
  const [data, setData] = useState<{ campuses: any[]; unassignedFaculties: any[] }>({
    campuses: [],
    unassignedFaculties: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isCampusOpen, setIsCampusOpen] = useState(false);
  const [isFacultyOpen, setIsFacultyOpen] = useState(false);
  const [isVenueOpen, setIsVenueOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  // Forms
  const [campusCode, setCampusCode] = useState('');
  const [campusName, setCampusName] = useState('');
  const [campusAddress, setCampusAddress] = useState('');

  const [facultyCode, setFacultyCode] = useState('');
  const [facultyName, setFacultyName] = useState('');

  const [venueName, setVenueName] = useState('');
  const [venueCapacity, setVenueCapacity] = useState(150);
  const [venueBuilding, setVenueBuilding] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    const res = await getCampusesWithFaculties();
    if (res.success && res.data) {
      setData(res.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateCampus = () => {
    if (!campusCode || !campusName) return;
    startTransition(async () => {
      const res = await createCampusAction({
        code: campusCode,
        name: campusName,
        address: campusAddress,
        isMain: data.campuses.length === 0,
      });

      if (res.success) {
        toast({ title: 'Campus Registered', description: `Added campus "${campusName}" successfully.` });
        setIsCampusOpen(false);
        setCampusCode('');
        setCampusName('');
        setCampusAddress('');
        loadData();
      } else {
        toast({ variant: 'destructive', title: 'Error', description: res.error });
      }
    });
  };

  const handleCreateFaculty = () => {
    if (!facultyCode || !facultyName) return;
    startTransition(async () => {
      const mainCampus = data.campuses.find((c) => c.isMain) || data.campuses[0];
      const res = await createFacultyAction({
        code: facultyCode,
        name: facultyName,
        campusId: mainCampus?.id,
      });

      if (res.success) {
        toast({ title: 'Faculty Registered', description: `Faculty "${facultyName}" configured.` });
        setIsFacultyOpen(false);
        setFacultyCode('');
        setFacultyName('');
        loadData();
      } else {
        toast({ variant: 'destructive', title: 'Error', description: res.error });
      }
    });
  };

  const handleCreateVenue = () => {
    if (!venueName) return;
    startTransition(async () => {
      const mainCampus = data.campuses.find((c) => c.isMain) || data.campuses[0];
      const res = await createLectureVenueAction({
        name: venueName,
        capacity: Number(venueCapacity),
        building: venueBuilding,
        campusId: mainCampus?.id,
      });

      if (res.success) {
        toast({ title: 'Venue Registered', description: `Lecture venue "${venueName}" created.` });
        setIsVenueOpen(false);
        setVenueName('');
        setVenueBuilding('');
        loadData();
      } else {
        toast({ variant: 'destructive', title: 'Error', description: res.error });
      }
    });
  };

  const totalCampuses = data.campuses.length;
  const totalFaculties = data.campuses.reduce((acc, c) => acc + (c.faculties?.length || 0), 0) + data.unassignedFaculties.length;
  const totalVenues = data.campuses.reduce((acc, c) => acc + (c.venues?.length || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Multi-Campus & Faculty Governance</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Organize institutional campuses, collegiate faculties, academic deaneries, and shared lecture theatres.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Dialog open={isCampusOpen} onOpenChange={setIsCampusOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="flex items-center gap-1.5">
                <Plus className="h-4 w-4" /> Add Campus
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Register Institutional Campus</DialogTitle>
                <DialogDescription>Add a satellite, college, or regional branch campus.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label>Campus Code (e.g. MAIN, MED, DOWNTOWN)</Label>
                  <Input value={campusCode} onChange={(e) => setCampusCode(e.target.value)} />
                </div>
                <div>
                  <Label>Campus Full Name</Label>
                  <Input value={campusName} onChange={(e) => setCampusName(e.target.value)} />
                </div>
                <div>
                  <Label>Physical Address / Location</Label>
                  <Input value={campusAddress} onChange={(e) => setCampusAddress(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCampusOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateCampus} disabled={isPending}>
                  {isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Save Campus
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isFacultyOpen} onOpenChange={setIsFacultyOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="flex items-center gap-1.5">
                <Plus className="h-4 w-4" /> Add Faculty
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Register Academic Faculty</DialogTitle>
                <DialogDescription>Define a collegiate faculty or school.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label>Faculty Code (e.g. FCI, ENG, LAW, MED)</Label>
                  <Input value={facultyCode} onChange={(e) => setFacultyCode(e.target.value)} />
                </div>
                <div>
                  <Label>Faculty Name</Label>
                  <Input value={facultyName} onChange={(e) => setFacultyName(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsFacultyOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateFaculty} disabled={isPending}>
                  {isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Save Faculty
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isVenueOpen} onOpenChange={setIsVenueOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="flex items-center gap-1.5">
                <Plus className="h-4 w-4" /> Add Lecture Venue
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Lecture Venue / Exam Hall</DialogTitle>
                <DialogDescription>Assign lecture hall capacities for timetable scheduling.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label>Venue Name (e.g. University Auditorium, LT-1)</Label>
                  <Input value={venueName} onChange={(e) => setVenueName(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Seating Capacity</Label>
                    <Input type="number" value={venueCapacity} onChange={(e) => setVenueCapacity(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Building / Block</Label>
                    <Input value={venueBuilding} onChange={(e) => setVenueBuilding(e.target.value)} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsVenueOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateVenue} disabled={isPending}>
                  {isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Save Venue
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-primary shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Institutional Campuses</CardTitle>
            <Building2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCampuses}</div>
            <p className="text-muted-foreground text-xs">Active physical/satellite locations</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-600 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Academic Faculties</CardTitle>
            <School className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{totalFaculties}</div>
            <p className="text-muted-foreground text-xs">Colleges and schools of study</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-600 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Lecture & Exam Theatres</CardTitle>
            <MapPin className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">{totalVenues}</div>
            <p className="text-muted-foreground text-xs">Allocated classrooms and exam venues</p>
          </CardContent>
        </Card>
      </div>

      {/* Campuses & Faculties Cards */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : data.campuses.length === 0 ? (
        <Card className="p-12 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-base font-semibold">No Campuses Configured Yet</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Click &apos;Add Campus&apos; above to register your institution&apos;s main and satellite campuses.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {data.campuses.map((campus) => (
            <Card key={campus.id} className="border shadow-md overflow-hidden">
              <CardHeader className="bg-muted/30 border-b pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-foreground">{campus.name}</span>
                      {campus.isMain && (
                        <Badge className="bg-primary text-primary-foreground text-[10px]">
                          Main Campus
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {campus.address || 'Central University Campus'}
                    </p>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs">
                    {campus.code}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-5 space-y-4">
                {/* Faculties List */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Collegiate Faculties ({campus.faculties?.length || 0})
                  </h4>
                  {campus.faculties?.length === 0 ? (
                    <div className="text-xs text-muted-foreground/70 italic py-2">
                      No faculties assigned to this campus.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {campus.faculties.map((f: any) => (
                        <div key={f.id} className="p-2.5 rounded-xl border bg-card flex justify-between items-center text-xs">
                          <div>
                            <span className="font-semibold text-foreground mr-1.5">{f.code}:</span>
                            <span className="text-muted-foreground">{f.name}</span>
                          </div>
                          <Badge variant="secondary" className="text-[10px]">
                            {f.departments?.length || 0} Depts
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Venues List */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Lecture Venues & Theatres ({campus.venues?.length || 0})
                  </h4>
                  {campus.venues?.length === 0 ? (
                    <div className="text-xs text-muted-foreground/70 italic py-2">
                      No lecture venues configured for this campus.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {campus.venues.map((v: any) => (
                        <Badge key={v.id} variant="outline" className="text-xs py-1 px-2.5 flex items-center gap-1.5">
                          <Building2 className="h-3 w-3 text-primary" />
                          <span>{v.name}</span>
                          <span className="text-muted-foreground font-mono">({v.capacity} seats)</span>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
