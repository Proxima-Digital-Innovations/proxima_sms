'use client';

import { useState, useEffect } from 'react';
import { useRole } from '@/context/role-context';
import { useLanguage } from '@/context/language-context';
import { useTheme } from '@/context/theme-context';
import { useToast } from '@/hooks/use-toast';
import { 
  Globe, 
  Check, 
  Sun, 
  Moon, 
  User as UserIcon, 
  Mail, 
  ShieldCheck, 
  ExternalLink, 
  IdCard,
  CheckCircle2,
  Phone,
  MapPin,
  Users,
  GraduationCap,
  Wallet,
  Receipt,
  ArrowRight,
  Lock
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getParentProfile } from '@/actions/parent-actions';
import Link from 'next/link';

const ROLE_DISPLAY_NAMES: Record<string, { en: string; ar: string }> = {
  'SUPER_ADMIN': { en: 'Super Admin', ar: 'المشرف العام' },
  'ADMIN': { en: 'Administrator', ar: 'مدير النظام' },
  'TEACHER': { en: 'Teacher', ar: 'معلم' },
  'PARENT': { en: 'Parent & Guardian', ar: 'ولي أمر' },
  'STUDENT': { en: 'Student', ar: 'طالب' },
  'ACCOUNTANT': { en: 'Finance Officer', ar: 'المحاسب المالي' },
  'EXAM_OFFICER': { en: 'Exam Officer', ar: 'مسؤول الامتحانات' },
  'HOD': { en: 'Head of Department', ar: 'رئيس القسم' },
  'SLT': { en: 'School Leadership', ar: 'إدارة المدرسة' },
  'STAFF': { en: 'Staff Member', ar: 'كادر وظيفي' },
};

export default function ProfilePage() {
  const { user, role } = useRole();
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [parentData, setParentData] = useState<any>(null);

  const isParent = (role || '').toUpperCase() === 'PARENT';

  useEffect(() => {
    if (isParent) {
      getParentProfile().then((res) => {
        if (res.success) {
          setParentData(res);
        }
      });
    }
  }, [isParent]);

  const handleLanguageChange = async (newLang: 'en' | 'ar') => {
    if (newLang === language) return;
    try {
      await setLanguage(newLang);
      toast({
        title: newLang === 'ar' ? 'تم تغيير اللغة بنجاح' : 'Language updated successfully',
        description: newLang === 'ar' 
          ? 'تم تفعيل واجهة اللغة العربية بنجاح مع اتجاه اليمين إلى اليسار (RTL)' 
          : 'English interface has been activated with Left-to-Right layout.',
      });
    } catch {
      toast({
        title: 'Error updating language',
        variant: 'destructive',
      });
    }
  };

  const displayName = parentData?.guardian?.fullName || user?.name || (language === 'ar' ? 'مستخدم النظام' : 'User');
  const userInitials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'ID';

  const displayRole = ROLE_DISPLAY_NAMES[(role || '').toUpperCase()]?.[language] || role || 'User';

  return (
    <div className="w-full space-y-5 animate-in fade-in duration-300">
      {/* Header Profile Hero Card */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 md:p-8 shadow-xl text-white">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left rtl:md:text-right">
          <div className="relative">
            <Avatar className="h-24 w-24 rounded-2xl border-2 border-emerald-500/40 shadow-lg shadow-emerald-950/50">
              <AvatarImage src={user?.personalInfo?.profilePicture || undefined} />
              <AvatarFallback className="rounded-2xl text-2xl font-black bg-gradient-to-tr from-emerald-600 to-teal-500 text-white">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 ring-4 ring-slate-950">
              <CheckCircle2 className="h-3.5 w-3.5 text-slate-950 stroke-[3]" />
            </span>
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center justify-center md:justify-start rtl:md:justify-start gap-3">
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                {displayName}
              </h1>
              <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs px-3 py-1 font-semibold rounded-full">
                {displayRole}
              </Badge>
              <Badge variant="outline" className="border-slate-700 text-slate-300 text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Active & Verified
              </Badge>
            </div>

            <p className="text-sm text-slate-400 flex items-center justify-center md:justify-start rtl:md:justify-start gap-2">
              <Mail className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span className="font-mono text-slate-300">{parentData?.guardian?.email || user?.email || 'parent@proximahub.com'}</span>
            </p>

            {/* Role-Specific Action Bar */}
            <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start rtl:md:justify-start gap-2">
              {isParent ? (
                <>
                  <Button asChild size="sm" variant="outline" className="h-8 text-xs rounded-xl border-slate-700 bg-slate-900/60 text-slate-200 hover:bg-slate-800 hover:text-white gap-1.5">
                    <Link href="/dashboard/parent/wallet">
                      <Wallet className="h-3.5 w-3.5 text-emerald-400" />
                      Tuition Wallet (₦{(parentData?.wallet?.balance || 0).toLocaleString()})
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="h-8 text-xs rounded-xl border-slate-700 bg-slate-900/60 text-slate-200 hover:bg-slate-800 hover:text-white gap-1.5">
                    <Link href="/dashboard/parent/results">
                      <GraduationCap className="h-3.5 w-3.5 text-primary" />
                      Ward Report Cards
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="h-8 text-xs rounded-xl border-slate-700 bg-slate-900/60 text-slate-200 hover:bg-slate-800 hover:text-white gap-1.5">
                    <Link href="/dashboard/parent/invoices">
                      <Receipt className="h-3.5 w-3.5 text-indigo-400" />
                      Fee Invoices
                    </Link>
                  </Button>
                </>
              ) : (
                user?.id && (
                  <Button 
                    asChild 
                    variant="outline" 
                    size="sm" 
                    className="rounded-xl border-slate-700 bg-slate-900/60 text-slate-200 hover:bg-slate-800 hover:text-white hover:border-emerald-500/40 text-xs h-9 cursor-pointer"
                  >
                    <Link href={`/dashboard/users/${user.id}`}>
                      <ExternalLink className="mr-1.5 h-3.5 w-3.5 text-emerald-400" />
                      View Staff Record
                    </Link>
                  </Button>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Full Width Multi-Column */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 w-full">
        {/* Identity & Personal Information */}
        <Card className="rounded-2xl border-border bg-card shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <IdCard className="h-4 w-4 text-emerald-500 shrink-0" />
              {isParent ? 'Guardian Registration Details' : 'Personal & Staff Information'}
            </CardTitle>
            <CardDescription className="text-xs">
              {isParent ? 'Verified guardian details registered with the school administration' : 'Your verified institutional identity records'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-muted-foreground flex items-center gap-2">
                <UserIcon className="h-3.5 w-3.5 text-muted-foreground" /> Full Name
              </span>
              <span className="font-semibold text-foreground">{displayName}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-muted-foreground flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Email Address
              </span>
              <span className="font-mono text-xs text-foreground">{parentData?.guardian?.email || user?.email || 'parent@proximahub.com'}</span>
            </div>
            {isParent ? (
              <>
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Contact Phone
                  </span>
                  <span className="font-mono text-xs text-foreground font-semibold">
                    {parentData?.guardian?.phone || '08031234567'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" /> Residential Address
                  </span>
                  <span className="text-xs text-foreground max-w-[280px] text-right truncate">
                    {parentData?.guardian?.address || 'No 15 Crescent, GRA, Kaduna'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-muted-foreground">Relationship</span>
                  <Badge variant="outline" className="text-xs font-semibold">
                    {parentData?.guardian?.relationship || 'Father / Guardian'}
                  </Badge>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">Assigned Role</span>
                <Badge variant="outline" className="font-medium text-xs">
                  {displayRole}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Linked Wards (for Parents) or Staff Attendance (for Staff) */}
        {isParent ? (
          <Card className="rounded-2xl border-border bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                <Users className="h-4 w-4 text-primary shrink-0" />
                Enrolled Children / Wards ({parentData?.wards?.length || 0})
              </CardTitle>
              <CardDescription className="text-xs">
                Students currently registered and linked under your guardianship
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(parentData?.wards || []).map((w: any) => (
                <div key={w.id} className="p-3.5 rounded-xl border border-border bg-muted/20 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                      {w.firstName?.[0]}{w.lastName?.[0]}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-foreground">
                        {w.firstName} {w.lastName}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                        <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                          {w.class?.name || w.class || 'Class'}
                        </Badge>
                        <span className="font-mono text-[11px]">{w.studentId || 'STU-PROX'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button asChild size="sm" variant="outline" className="h-7 text-xs rounded-lg">
                      <Link href={`/dashboard/parent/results?studentId=${w.id}`}>
                        Report Card <ArrowRight className="h-3 w-3 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : (
          /* Staff Security & Kiosk Clock-in */
          <Card className="rounded-2xl border-border bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                Staff Access & Kiosk Credentials
              </CardTitle>
              <CardDescription className="text-xs">
                Authentication, kiosk clock-in, and access credentials
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-border">
                <div>
                  <div className="font-medium text-foreground">Biometric Kiosk PIN</div>
                  <div className="text-xs text-muted-foreground">Used for clocking in on smart kiosks</div>
                </div>
                <Badge variant="outline" className="font-mono text-xs bg-muted">Active</Badge>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="font-medium text-foreground">Account Access Control</div>
                  <div className="text-xs text-muted-foreground">Role-based institutional permissions</div>
                </div>
                <Badge variant="secondary" className="text-xs">Verified</Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Language Selection Card */}
        <Card className="rounded-2xl border-border bg-card shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                  <Globe className="h-5 w-5 text-emerald-500 shrink-0" />
                  Language Preference
                </CardTitle>
                <CardDescription className="text-xs">
                  Choose your preferred language for the system interface and reports
                </CardDescription>
              </div>
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-xs">
                {language.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            {/* English */}
            <div
              onClick={() => handleLanguageChange('en')}
              className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 flex items-center justify-between ${
                language === 'en'
                  ? 'border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500 text-foreground'
                  : 'border-border hover:border-slate-400 dark:hover:border-slate-700 bg-card text-muted-foreground'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold text-foreground shrink-0 border border-border">
                  EN
                </div>
                <div>
                  <div className="font-semibold text-sm text-foreground flex items-center gap-2">
                    English
                    {language === 'en' && (
                      <span className="text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Left-to-right (LTR) standard layout</p>
                </div>
              </div>
              {language === 'en' && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shrink-0">
                  <Check className="h-4 w-4 stroke-[3]" />
                </div>
              )}
            </div>

            {/* Arabic */}
            <div
              onClick={() => handleLanguageChange('ar')}
              className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 flex items-center justify-between ${
                language === 'ar'
                  ? 'border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500 text-foreground'
                  : 'border-border hover:border-slate-400 dark:hover:border-slate-700 bg-card text-muted-foreground'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold text-foreground shrink-0 border border-border">
                  AR
                </div>
                <div>
                  <div className="font-semibold text-sm text-foreground flex items-center gap-2">
                    العربية (Arabic)
                    {language === 'ar' && (
                      <span className="text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                        نشط
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Full Right-to-left (RTL) interface with Arabic numerals</p>
                </div>
              </div>
              {language === 'ar' && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shrink-0">
                  <Check className="h-4 w-4 stroke-[3]" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Appearance & Theme Card */}
        <Card className="rounded-2xl border-border bg-card shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                  <Sun className="h-5 w-5 text-amber-500 dark:hidden shrink-0" />
                  <Moon className="h-5 w-5 text-indigo-400 hidden dark:inline shrink-0" />
                  Appearance & Theme
                </CardTitle>
                <CardDescription className="text-xs">
                  Choose your visual preference for the portal interface
                </CardDescription>
              </div>
              <Badge variant="outline" className="border-border text-xs capitalize">
                {theme}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-3">
              {/* Light Mode */}
              <div
                onClick={() => setTheme('light')}
                className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 flex flex-col items-center justify-center gap-2 text-center ${
                  theme === 'light'
                    ? 'border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500'
                    : 'border-border hover:border-slate-400 dark:hover:border-slate-700 bg-card'
                }`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 shrink-0">
                  <Sun className="h-5 w-5" />
                </div>
                <div className="font-semibold text-sm text-foreground">Light Mode</div>
                {theme === 'light' && (
                  <Badge className="bg-emerald-500 text-white text-[10px] py-0 px-2">Active</Badge>
                )}
              </div>

              {/* Dark Mode */}
              <div
                onClick={() => setTheme('dark')}
                className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 flex flex-col items-center justify-center gap-2 text-center ${
                  theme === 'dark'
                    ? 'border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500'
                    : 'border-border hover:border-slate-400 dark:hover:border-slate-700 bg-card'
                }`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-400 shrink-0">
                  <Moon className="h-5 w-5" />
                </div>
                <div className="font-semibold text-sm text-foreground">Dark Mode</div>
                {theme === 'dark' && (
                  <Badge className="bg-emerald-500 text-white text-[10px] py-0 px-2">Active</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
