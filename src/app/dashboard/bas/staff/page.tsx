'use client';

import { useState, useEffect, useMemo } from 'react';
import { getEnrolledStaff } from '@/actions/bas-actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Search, Fingerprint, KeyRound, Users, ArrowLeft, ShieldCheck, UserCheck, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 }
  }
};

const AVATAR_PALETTE = [
  'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
  'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
];

function getAvatarStyle(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function getInitials(name?: string) {
  if (!name) return 'ST';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function EnrolledStaffPage() {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchStaff = async () => {
      const res = await getEnrolledStaff();
      if (res.success && res.data) {
        setStaff(res.data);
      }
      setLoading(false);
    };
    fetchStaff();
  }, []);

  const stats = useMemo(() => {
    const total = staff.length;
    const withFingerprint = staff.filter(s => s.biometricTemplate || s.isBiometricEnrolled).length;
    const withPin = staff.filter(s => s.kioskPin).length;
    const dualAuth = staff.filter(s => (s.biometricTemplate || s.isBiometricEnrolled) && s.kioskPin).length;
    return { total, withFingerprint, withPin, dualAuth };
  }, [staff]);

  const filteredStaff = useMemo(() => {
    if (!searchTerm.trim()) return staff;
    const q = searchTerm.toLowerCase();
    return staff.filter(s => 
      s.firstName?.toLowerCase().includes(q) ||
      s.lastName?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.staffId?.toLowerCase().includes(q) ||
      s.department?.name?.toLowerCase().includes(q)
    );
  }, [staff, searchTerm]);

  return (
    <div className="space-y-6 w-full max-w-full min-w-0">
      {/* Top Header Card */}
      <motion.div 
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-background p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-border backdrop-blur-sm shadow-sm w-full min-w-0"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-indigo-600/20 text-purple-600 dark:text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0 shadow-sm">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">Biometric Staff Roster</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Manage biometric templates, terminal authentication credentials, and security PINs.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button asChild variant="outline" size="sm" className="rounded-xl border-border hover:bg-muted">
            <Link href="/dashboard/bas/dashboard">
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Dashboard
            </Link>
          </Button>
        </div>
      </motion.div>

      {/* KPI Metric Summary */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full min-w-0"
      >
        <Card className="bg-background border-border shadow-none rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Enrolled</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-foreground mt-2">{loading ? '—' : stats.total}</div>
          <p className="text-[11px] text-muted-foreground mt-1">Active staff profiles</p>
        </Card>

        <Card className="bg-background border-border shadow-none rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fingerprint Registered</span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Fingerprint className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-sky-600 dark:text-sky-400 mt-2">{loading ? '—' : stats.withFingerprint}</div>
          <p className="text-[11px] text-muted-foreground mt-1">Biometric template synced</p>
        </Card>

        <Card className="bg-background border-border shadow-none rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">PIN Authenticated</span>
            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <KeyRound className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-violet-600 dark:text-violet-400 mt-2">{loading ? '—' : stats.withPin}</div>
          <p className="text-[11px] text-muted-foreground mt-1">Numeric clock-in PINs</p>
        </Card>

        <Card className="bg-background border-border shadow-none rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dual Factor</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-2">{loading ? '—' : stats.dualAuth}</div>
          <p className="text-[11px] text-muted-foreground mt-1">Both FP and PIN ready</p>
        </Card>
      </motion.div>

      {/* Main Roster Card */}
      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        <motion.div variants={itemVariants}>
          <Card className="bg-background border-border shadow-none rounded-3xl overflow-hidden backdrop-blur-sm">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border bg-background p-5 sm:p-6 gap-4">
              <div>
                <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                  <span>Enrolled Staff Roster</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-muted font-normal text-muted-foreground">
                    {filteredStaff.length} staff
                  </span>
                </CardTitle>
                <CardDescription className="text-muted-foreground text-xs sm:text-sm mt-0.5">
                  Verified personnel eligible for kiosk terminal check-in.
                </CardDescription>
              </div>
              <div className="relative w-full sm:w-72 md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search staff by name or ID..."
                  className="pl-9 bg-background border-border text-foreground rounded-xl h-10 text-xs sm:text-sm focus-visible:ring-primary w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {loading ? (
                <div className="flex h-64 items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-r-transparent" />
                </div>
              ) : filteredStaff.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground px-4">
                  <div className="w-14 h-14 bg-muted/60 border border-border rounded-2xl flex items-center justify-center mb-3">
                    <Fingerprint className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <p className="text-base font-bold text-foreground">No enrolled staff found</p>
                  <p className="text-xs text-muted-foreground max-w-sm mt-1">
                    Set a kiosk terminal to "Enrollment Mode" or configure staff PINs in the Staff Management directory.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto w-full min-w-0">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="pl-6 font-bold text-muted-foreground py-3.5">Staff Member</TableHead>
                        <TableHead className="font-bold text-muted-foreground py-3.5">Staff ID</TableHead>
                        <TableHead className="font-bold text-muted-foreground py-3.5">Department</TableHead>
                        <TableHead className="font-bold text-muted-foreground py-3.5">Authentication Methods</TableHead>
                        <TableHead className="pr-6 text-right font-bold text-muted-foreground py-3.5">Role</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStaff.map((s) => {
                        const fullName = `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.email;
                        const hasFingerprint = s.biometricTemplate || s.isBiometricEnrolled;
                        const hasPin = Boolean(s.kioskPin);

                        return (
                          <TableRow key={s.id} className="border-border hover:bg-muted/40 transition-colors">
                            <TableCell className="pl-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 border",
                                  getAvatarStyle(fullName)
                                )}>
                                  {getInitials(fullName)}
                                </div>
                                <div>
                                  <div className="font-semibold text-foreground">{fullName}</div>
                                  <div className="text-[11px] text-muted-foreground">{s.email}</div>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="font-mono text-xs text-foreground py-4">
                              {s.staffId ? (
                                <span className="px-2 py-0.5 rounded-md bg-muted text-foreground border border-border font-semibold">
                                  {s.staffId}
                                </span>
                              ) : (
                                <span className="text-muted-foreground italic">N/A</span>
                              )}
                            </TableCell>

                            <TableCell className="text-xs text-foreground font-medium py-4">
                              {s.department?.name || <span className="text-muted-foreground italic">Unassigned</span>}
                            </TableCell>

                            <TableCell className="py-4">
                              <div className="flex flex-wrap items-center gap-2">
                                {/* Clear, High-Contrast Fingerprint Badge */}
                                {hasFingerprint && (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-sky-100 text-sky-900 border border-sky-300 dark:bg-sky-950/50 dark:text-sky-200 dark:border-sky-800 shadow-2xs">
                                    <Fingerprint className="w-3.5 h-3.5 text-sky-700 dark:text-sky-400 shrink-0" />
                                    <span>Fingerprint</span>
                                  </span>
                                )}

                                {/* Clear, High-Contrast PIN Code Badge */}
                                {hasPin && (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-purple-100 text-purple-900 border border-purple-300 dark:bg-purple-950/50 dark:text-purple-200 dark:border-purple-800 shadow-2xs">
                                    <KeyRound className="w-3.5 h-3.5 text-purple-700 dark:text-purple-400 shrink-0" />
                                    <span>PIN Code</span>
                                  </span>
                                )}

                                {/* Fallback if neither */}
                                {!hasFingerprint && !hasPin && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-muted text-muted-foreground border border-border italic">
                                    Not Enrolled
                                  </span>
                                )}
                              </div>
                            </TableCell>

                            <TableCell className="pr-6 text-right py-4">
                              <Badge variant="outline" className="bg-muted text-foreground border-border text-xs font-medium">
                                {s.role}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
