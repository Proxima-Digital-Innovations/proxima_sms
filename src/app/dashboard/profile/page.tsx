'use client';

import { useState } from 'react';
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
  Sparkles,
  KeyRound,
  IdCard,
  Building,
  CheckCircle2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, role } = useRole();
  const { language, setLanguage, t, isRtl } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [isUpdatingLang, setIsUpdatingLang] = useState(false);

  const handleLanguageChange = async (newLang: 'en' | 'ar') => {
    if (newLang === language) return;
    setIsUpdatingLang(true);
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
    } finally {
      setIsUpdatingLang(false);
    }
  };

  const userInitials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
    : role?.substring(0, 2).toUpperCase() || '..';

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in duration-300">
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
                {user?.name || 'Administrator'}
              </h1>
              <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs px-3 py-1 font-semibold rounded-full">
                {role || 'STAFF'}
              </Badge>
              <Badge variant="outline" className="border-slate-700 text-slate-300 text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                {t('activeAccount')}
              </Badge>
            </div>

            <p className="text-sm text-slate-400 flex items-center justify-center md:justify-start rtl:md:justify-start gap-2">
              <Mail className="h-3.5 w-3.5 text-emerald-400" />
              {user?.email || 'admin@proximahub.com'}
            </p>

            {user?.id && (
              <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start rtl:md:justify-start gap-3">
                <Button 
                  asChild 
                  variant="outline" 
                  size="sm" 
                  className="rounded-xl border-slate-700 bg-slate-900/60 text-slate-200 hover:bg-slate-800 hover:text-white hover:border-emerald-500/40 text-xs h-9"
                >
                  <Link href={`/dashboard/users/${user.id}`}>
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5 rtl:ml-1.5 rtl:mr-0 text-emerald-400" />
                    {t('viewStaffProfile')}
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Language Selection Card */}
        <Card className="rounded-2xl border-border bg-card shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                  <Globe className="h-5 w-5 text-emerald-500" />
                  {t('languagePreference')}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t('languageSubtitle')}
                </CardDescription>
              </div>
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-xs">
                {language.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            {/* English Option */}
            <div
              onClick={() => handleLanguageChange('en')}
              className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 flex items-center justify-between ${
                language === 'en'
                  ? 'border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500 text-foreground'
                  : 'border-border hover:border-slate-400 dark:hover:border-slate-700 bg-card text-muted-foreground'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-xl font-bold">
                  🇺🇸
                </div>
                <div>
                  <div className="font-semibold text-sm text-foreground flex items-center gap-2">
                    {t('english')}
                    {language === 'en' && (
                      <span className="text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('englishDesc')}</p>
                </div>
              </div>
              {language === 'en' && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <Check className="h-4 w-4 stroke-[3]" />
                </div>
              )}
            </div>

            {/* Arabic Option */}
            <div
              onClick={() => handleLanguageChange('ar')}
              className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 flex items-center justify-between ${
                language === 'ar'
                  ? 'border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500 text-foreground'
                  : 'border-border hover:border-slate-400 dark:hover:border-slate-700 bg-card text-muted-foreground'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-xl font-bold">
                  🇸🇦
                </div>
                <div>
                  <div className="font-semibold text-sm text-foreground flex items-center gap-2 font-arabic">
                    {t('arabic')}
                    {language === 'ar' && (
                      <span className="text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                        نشط
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('arabicDesc')}</p>
                </div>
              </div>
              {language === 'ar' && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white">
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
                  <Sun className="h-5 w-5 text-amber-500 dark:hidden" />
                  <Moon className="h-5 w-5 text-indigo-400 hidden dark:inline" />
                  {t('appearance')}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t('appearanceSubtitle')}
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
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
                  <Sun className="h-5 w-5" />
                </div>
                <div className="font-semibold text-sm text-foreground">{t('lightMode')}</div>
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
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-400">
                  <Moon className="h-5 w-5" />
                </div>
                <div className="font-semibold text-sm text-foreground">{t('darkMode')}</div>
                {theme === 'dark' && (
                  <Badge className="bg-emerald-500 text-white text-[10px] py-0 px-2">Active</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Identity & Details Card */}
        <Card className="rounded-2xl border-border bg-card shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <IdCard className="h-4 w-4 text-emerald-500" />
              {t('personalInfo')}
            </CardTitle>
            <CardDescription className="text-xs">
              {t('personalInfoSubtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">{t('fullName')}</span>
              <span className="font-semibold text-foreground">{user?.name || 'Administrator'}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">{t('emailAddress')}</span>
              <span className="font-mono text-xs text-foreground">{user?.email || 'admin@proximahub.com'}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">{t('assignedRole')}</span>
              <Badge variant="outline" className="font-medium text-xs">
                {role || 'ADMIN'}
              </Badge>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">{t('accountStatus')}</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {t('activeAccount')}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Security & Access Card */}
        <Card className="rounded-2xl border-border bg-card shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              {t('security')}
            </CardTitle>
            <CardDescription className="text-xs">
              {t('securitySubtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between py-2 border-b border-border">
              <div>
                <div className="font-medium text-foreground">{t('biometricBasPin')}</div>
                <div className="text-xs text-muted-foreground">Used for clocking in on smart kiosks</div>
              </div>
              <Badge variant="outline" className="font-mono text-xs bg-slate-100 dark:bg-slate-800">
                Active
              </Badge>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <div className="font-medium text-foreground">{t('accountSettings')}</div>
                <div className="text-xs text-muted-foreground">Managed by system administrator</div>
              </div>
              <Badge variant="secondary" className="text-xs">
                Verified
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
