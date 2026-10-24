'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/language-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Upload, GraduationCap, Loader2, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AddStudentForm } from './add-student-form';
import { BulkStudentUploadDialog } from './bulk-student-upload-dialog';
import { getTimsPrograms, enrollTertiaryStudentAction } from '@/actions/tims-actions';
import { useToast } from '@/hooks/use-toast';

export function StudentHeaderActions() {
  const router = useRouter();
  const { language } = useLanguage();
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isTertiaryOpen, setIsTertiaryOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Tertiary Undergraduate Form State
  const [programs, setPrograms] = useState<any[]>([]);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [matricNumber, setMatricNumber] = useState('');
  const [programId, setProgramId] = useState('');
  const [currentLevel, setCurrentLevel] = useState(100);

  // Optional Parent / Sponsor Linking Fields for Tertiary Undergraduate
  const [guardianName, setGuardianName] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianRelationship, setGuardianRelationship] = useState('Father / Sponsor');

  useEffect(() => {
    if (isTertiaryOpen && programs.length === 0) {
      getTimsPrograms().then((res) => {
        if (res.success && res.data) {
          setPrograms(res.data);
          if (res.data.length > 0) setProgramId(res.data[0].id);
        }
      });
    }
  }, [isTertiaryOpen, programs.length]);

  const handleRefresh = () => {
    router.refresh();
  };

  const handleEnrollTertiary = () => {
    if (!firstName || !lastName || !email || !matricNumber || !programId) {
      toast({
        variant: 'destructive',
        title: 'Missing Fields',
        description: 'Please complete all undergraduate matriculation fields.',
      });
      return;
    }

    startTransition(async () => {
      const res = await enrollTertiaryStudentAction({
        firstName,
        lastName,
        email,
        matricNumber,
        programId,
        currentLevel,
        guardianName: guardianName.trim() || undefined,
        guardianEmail: guardianEmail.trim() || undefined,
        guardianPhone: guardianPhone.trim() || undefined,
        guardianRelationship: guardianRelationship.trim() || 'Parent / Sponsor',
      });

      if (res.success) {
        toast({
          title: 'Undergraduate Matriculated',
          description: `${firstName} ${lastName} (${matricNumber}) enrolled${guardianEmail ? ` & linked to parent (${guardianEmail})` : ''}. Default password: student123`,
        });
        setIsTertiaryOpen(false);
        setFirstName('');
        setLastName('');
        setEmail('');
        setMatricNumber('');
        setGuardianName('');
        setGuardianEmail('');
        setGuardianPhone('');
        handleRefresh();
      } else {
        toast({
          variant: 'destructive',
          title: 'Enrollment Failed',
          description: res.error,
        });
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0">
      {/* Bulk Upload Dialog */}
      <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            className="bg-background border-border hover:bg-muted hover:text-foreground transition-colors rounded-xl h-10 px-3.5 text-xs sm:text-sm font-medium"
          >
            <Upload className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0 shrink-0" />
            <span>{language === 'ar' ? 'رفع جماعي للطلاب' : 'Bulk Upload'}</span>
          </Button>
        </DialogTrigger>
        <BulkStudentUploadDialog 
          onUploadComplete={() => {
            setIsBulkOpen(false);
            handleRefresh();
          }} 
        />
      </Dialog>

      {/* Enroll Tertiary Undergraduate Dialog */}
      <Dialog open={isTertiaryOpen} onOpenChange={setIsTertiaryOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 rounded-xl h-10 px-3.5 text-xs sm:text-sm font-semibold"
          >
            <GraduationCap className="mr-2 h-4 w-4 shrink-0" />
            <span>Enroll Undergraduate</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-indigo-500" />
              Matriculate Tertiary Undergraduate (TIMS)
            </DialogTitle>
            <DialogDescription>
              Provision a university/college student account with Matriculation Number, Degree Program, and linked Parent/Sponsor Portal access.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">First Name</Label>
                <Input placeholder="e.g. Amina" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Last Name</Label>
                <Input placeholder="e.g. Bello" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Institutional Email</Label>
                <Input type="email" placeholder="amina.bello@student.edu" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Matriculation Number</Label>
                <Input placeholder="e.g. U2026/CSC/042" value={matricNumber} onChange={(e) => setMatricNumber(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">Degree Program</Label>
                <Select value={programId} onValueChange={setProgramId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select program" />
                  </SelectTrigger>
                  <SelectContent>
                    {programs.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.code} — {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Entry Level</Label>
                <Select value={String(currentLevel)} onValueChange={(v) => setCurrentLevel(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="100">100L (UTME)</SelectItem>
                    <SelectItem value="200">200L (DE)</SelectItem>
                    <SelectItem value="300">300L</SelectItem>
                    <SelectItem value="400">400L</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Parent / Sponsor Portal Linking Section */}
            <div className="pt-3 border-t border-border space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                <Users className="h-4 w-4" />
                <span>Parent / Sponsor Portal Linking (Optional)</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Link this undergraduate to an existing or new Parent account so their parent can monitor CGPA, course grades, and pay university tuition online.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Parent / Sponsor Full Name</Label>
                  <Input
                    placeholder="e.g. Alhaji Musa Ibrahim"
                    value={guardianName}
                    onChange={(e) => setGuardianName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Parent Login Email</Label>
                  <Input
                    type="email"
                    placeholder="e.g. parent@proximahub.com"
                    value={guardianEmail}
                    onChange={(e) => setGuardianEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Parent Phone Number</Label>
                  <Input
                    placeholder="e.g. +234 803 000 0001"
                    value={guardianPhone}
                    onChange={(e) => setGuardianPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Relationship</Label>
                  <Input
                    placeholder="e.g. Father / Sponsor"
                    value={guardianRelationship}
                    onChange={(e) => setGuardianRelationship(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTertiaryOpen(false)}>Cancel</Button>
            <Button onClick={handleEnrollTertiary} disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Complete Matriculation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enroll K-12 Student Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogTrigger asChild>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20 transition-all rounded-xl h-10 px-4 text-xs sm:text-sm font-medium">
            <PlusCircle className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0 shrink-0" />
            <span>{language === 'ar' ? 'تسجيل طالب جديد' : 'Add K-12 Student'}</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl border-border bg-background text-foreground max-h-[90vh] overflow-y-auto w-[95vw] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-foreground text-xl">
              {language === 'ar' ? 'تسجيل وقبول طالب جديد' : 'Enroll New Student'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs sm:text-sm">
              {language === 'ar' 
                ? 'املأ النموذج أدناه لإضافة بيانات الطالب وربطه بولي الأمر وتوليد حسابه.' 
                : 'Fill in the form below to add a new student and generate their guardian accounts.'}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <AddStudentForm />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
