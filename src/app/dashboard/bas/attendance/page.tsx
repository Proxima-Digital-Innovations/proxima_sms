'use client';

import { useState, useEffect } from 'react';
import { getMyAttendanceLogs } from '@/actions/bas-actions';
import { useRole } from '@/context/role-context';
import { useLanguage } from '@/context/language-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, Clock, TrendingUp, Award, Fingerprint, CheckCircle2, LogOut, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

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

export default function MyAttendancePage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const { user } = useRole();
  const { language, isRtl } = useLanguage();

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid) { setLoading(false); return; }

      const result = await getMyAttendanceLogs(user.uid);
      if (result.success) {
        setLogs(result.data || []);
        setMonthlyStats(result.monthlyStats);
      }
      setLoading(false);
    };
    fetchData();
  }, [user?.uid]);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  
  const paginatedLogs = logs.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.ceil(logs.length / pageSize);

  return (
    <div className="space-y-6 w-full max-w-full min-w-0">
      {/* Header Card */}
      <motion.div 
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-background p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-border backdrop-blur-sm shadow-sm w-full min-w-0"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
            <Fingerprint className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              {language === 'ar' ? 'سجل الحضور والبصمة الشخصي' : 'My Attendance'}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {language === 'ar'
                ? 'سجل تسجيل الحضور والانصراف الإلكتروني ونسبة الانضباط والمواظبة الشهرية.'
                : 'Your personal biometric clock-in records and monthly punctuality score.'}
            </p>
          </div>
        </div>

        <Button asChild variant="outline" size="sm" className="rounded-xl border-border hover:bg-muted">
          <Link href="/dashboard/bas/dashboard">
            <ArrowLeft className="w-4 h-4 mr-1.5 rtl:ml-1.5 rtl:mr-0 rtl:rotate-180 shrink-0" />
            <span>{language === 'ar' ? 'العودة للمنصة الحية' : 'Back to Terminal Stream'}</span>
          </Link>
        </Button>
      </motion.div>

      {/* Monthly Stats */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full min-w-0"
      >
        <StatCard 
          icon={<CalendarDays className="h-4 w-4" />} 
          iconColor="text-blue-600 dark:text-blue-400" 
          iconBg="bg-blue-500/10"
          title={language === 'ar' ? 'أيام الحضور' : 'Days Present'} 
          value={monthlyStats?.totalDays || 0} 
          sub={language === 'ar' ? 'خلال هذا الشهر' : 'This month'} 
          loading={loading} 
        />
        <StatCard 
          icon={<Clock className="h-4 w-4" />} 
          iconColor="text-emerald-600 dark:text-emerald-400" 
          iconBg="bg-emerald-500/10"
          title={language === 'ar' ? 'ساعات العمل' : 'Total Hours'} 
          value={`${monthlyStats?.totalHours || 0}h`} 
          sub={language === 'ar' ? `المعدل ${monthlyStats?.avgHoursPerDay || 0} س/يوم` : `Avg ${monthlyStats?.avgHoursPerDay || 0}h/day`} 
          loading={loading} 
        />
        <StatCard 
          icon={<Award className="h-4 w-4" />} 
          iconColor="text-amber-600 dark:text-amber-400" 
          iconBg="bg-amber-500/10"
          title={language === 'ar' ? 'نسبة الانضباط' : 'Punctuality'} 
          value={`${monthlyStats?.punctuality || 0}%`} 
          sub={language === 'ar' ? 'حضور في الموعد' : 'On-time arrivals'} 
          valueColor={(monthlyStats?.punctuality || 0) >= 90 ? 'text-emerald-600 dark:text-emerald-400' : (monthlyStats?.punctuality || 0) >= 70 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}
          loading={loading} 
        />
        <StatCard 
          icon={<TrendingUp className="h-4 w-4" />} 
          iconColor="text-purple-600 dark:text-purple-400" 
          iconBg="bg-purple-500/10"
          title={language === 'ar' ? 'معدل الدوام اليومي' : 'Avg Hours / Day'} 
          value={`${monthlyStats?.avgHoursPerDay || 0}h`} 
          sub={language === 'ar' ? 'متوسط الساعات' : 'Working average'} 
          loading={loading} 
        />
      </motion.div>

      {/* Attendance Table */}
      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        <motion.div variants={itemVariants}>
          <Card className="bg-background border-border shadow-none rounded-3xl overflow-hidden backdrop-blur-sm">
            <CardHeader className="border-b border-border bg-background p-6">
              <CardTitle className="text-xl font-bold text-foreground">
                {language === 'ar' ? 'سجلات تسجيل الدخول والخروج' : 'Recent Clock-in Logs'}
              </CardTitle>
              <CardDescription className="text-muted-foreground text-xs sm:text-sm">
                {language === 'ar' 
                  ? 'آخر 50 عملية حضور موثقة عبر أجهزة البصمة الذكية.'
                  : 'Your last 50 verified biometric terminal records.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex h-64 items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-r-transparent" />
                </div>
              ) : logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-center px-4">
                  <div className="w-14 h-14 bg-muted/60 border border-border rounded-2xl flex items-center justify-center mb-3">
                    <Clock className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <p className="text-base font-bold text-foreground">
                    {language === 'ar' ? 'لا توجد سجلات حضور مسجلة' : 'No attendance records found'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {language === 'ar' 
                      ? 'قم بالبصمة عند أي جهاز حضور في المدرسة لتسجيل تواجدك.'
                      : 'Check in at any campus kiosk to record your presence.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto w-full min-w-0">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="px-6 font-bold text-muted-foreground py-3.5">
                          {language === 'ar' ? 'التاريخ' : 'Date'}
                        </TableHead>
                        <TableHead className="font-bold text-muted-foreground py-3.5">
                          {language === 'ar' ? 'وقت الدخول' : 'Clock In'}
                        </TableHead>
                        <TableHead className="font-bold text-muted-foreground py-3.5">
                          {language === 'ar' ? 'وقت الخروج' : 'Clock Out'}
                        </TableHead>
                        <TableHead className="font-bold text-muted-foreground py-3.5">
                          {language === 'ar' ? 'المدة' : 'Duration'}
                        </TableHead>
                        <TableHead className="px-6 text-end font-bold text-muted-foreground py-3.5">
                          {language === 'ar' ? 'الحالة' : 'Status'}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedLogs.map((log) => (
                        <TableRow key={log.id} className="border-border hover:bg-muted/40 transition-colors">
                          <TableCell className="px-6 font-medium text-foreground py-3.5">{log.date}</TableCell>
                          <TableCell className="font-mono text-xs text-foreground py-3.5 ltr-only">{log.timeIn || '—'}</TableCell>
                          <TableCell className="font-mono text-xs text-foreground py-3.5 ltr-only">{log.timeOut || '—'}</TableCell>
                          <TableCell className="text-xs font-semibold text-foreground py-3.5">{log.duration || '—'}</TableCell>
                          <TableCell className="px-6 text-end py-3.5">
                            {log.type === 1 ? (
                              <Badge variant="outline" className={`font-semibold text-xs ${log.isLate ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'}`}>
                                {language === 'ar' ? (log.isLate ? 'متأخر' : 'في الموعد') : (log.isLate ? 'Late' : 'On Time')}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 font-semibold text-xs">
                                <LogOut className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0 shrink-0" />
                                <span>{language === 'ar' ? 'انصراف' : 'Clock Out'}</span>
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
            {totalPages > 1 && (
              <div className="p-4 border-t border-border bg-background flex justify-center">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    {[...Array(totalPages)].map((_, i) => (
                      <PaginationItem key={i}>
                        <PaginationLink 
                          onClick={() => setCurrentPage(i + 1)}
                          isActive={currentPage === i + 1}
                          className="cursor-pointer"
                        >
                          {i + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}

function StatCard({ icon, iconColor, iconBg, title, value, sub, loading, valueColor = "text-foreground" }: any) {
  return (
    <motion.div variants={itemVariants}>
      <Card className="bg-background border-border shadow-none rounded-2xl p-4 overflow-hidden group hover:border-primary/40 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</span>
          <div className={`p-2 rounded-xl ${iconBg} ${iconColor}`}>
            {icon}
          </div>
        </div>
        <div className="mt-3">
          {loading ? (
            <div className="h-8 bg-muted rounded animate-pulse w-1/2" />
          ) : (
            <>
              <div className={`text-2xl sm:text-3xl font-extrabold font-mono ${valueColor}`}>{value}</div>
              <p className="text-xs text-muted-foreground mt-1 font-medium">{sub}</p>
            </>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
