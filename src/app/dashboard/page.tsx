'use client';

import { useRole } from '@/context/role-context';
import { useLanguage } from '@/context/language-context';
import { Skeleton } from '@/components/ui/skeleton';
import dynamic from 'next/dynamic';

const DashboardSkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="h-8 w-1/4" />
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
    </div>
    <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
            <Skeleton className="h-96" />
        </div>
        <div className="lg:col-span-1">
            <Skeleton className="h-96" />
        </div>
    </div>
  </div>
);

const AdminDashboard = dynamic(
  () => import('@/components/dashboard/admin/new-admin-dashboard').then(mod => mod.NewAdminDashboard),
  { loading: () => <DashboardSkeleton />, ssr: false }
);
const HodDashboard = dynamic(
  () => import('@/components/dashboard/hod/hod-dashboard').then(mod => mod.HodDashboard),
  { loading: () => <DashboardSkeleton />, ssr: false }
);
const SltDashboard = dynamic(
  () => import('@/components/dashboard/admin/new-admin-dashboard').then(mod => mod.NewAdminDashboard),
  { loading: () => <DashboardSkeleton />, ssr: false }
);
const AccountantDashboard = dynamic(
  () => import('@/components/dashboard/admin/new-admin-dashboard').then(mod => mod.NewAdminDashboard),
  { loading: () => <DashboardSkeleton />, ssr: false }
);
const TeacherDashboard = dynamic(
  () => import('@/components/dashboard/teacher/teacher-dashboard').then(mod => mod.TeacherDashboard),
  { loading: () => <DashboardSkeleton />, ssr: false }
);
const TertiaryLecturerDashboard = dynamic(
  () => import('@/app/dashboard/tertiary/lecturer-studio/page'),
  { loading: () => <DashboardSkeleton />, ssr: false }
);
const ParentDashboard = dynamic(
  () => import('@/components/dashboard/parent/parent-dashboard').then(mod => mod.ParentDashboard),
  { loading: () => <DashboardSkeleton />, ssr: false }
);
const ExamOfficerDashboard = dynamic(
  () => import('@/components/dashboard/exam-officer/exam-officer-dashboard').then(mod => mod.ExamOfficerDashboard),
  { loading: () => <DashboardSkeleton />, ssr: false }
);
const TertiaryStudentDashboard = dynamic(
  () => import('@/app/dashboard/tertiary/student-hub/page'),
  { loading: () => <DashboardSkeleton />, ssr: false }
);
const SecondaryStudentDashboard = dynamic(
  () => import('@/app/student/dashboard/page'),
  { loading: () => <DashboardSkeleton />, ssr: false }
);

export default function DashboardPage() {
  const { user, role, activeModules, isLoading } = useRole();
  const { language } = useLanguage();
  const isTertiaryModuleActive = activeModules?.includes('TERTIARY_INSTITUTION');
  const userEmail = ((user as any)?.email || '').toLowerCase();
  const isSecondaryAccount =
    userEmail === 'student1@school.edu' ||
    ((user as any)?.institutionTier === 'SECONDARY' && userEmail !== 'student@proximahub.com');

  const isTertiaryStudent =
    userEmail === 'student@proximahub.com' ||
    userEmail.endsWith('@tims.edu.ng') ||
    (!isSecondaryAccount &&
      ((user as any)?.isTertiaryStudent !== undefined
        ? Boolean((user as any).isTertiaryStudent)
        : isTertiaryModuleActive));

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // Switch based on the user's assigned institutional role & tier
  switch (role) {
    case 'SUPER_ADMIN':
    case 'ADMIN':
      return <AdminDashboard />;
    case 'SLT':
      return <SltDashboard />;
    case 'HOD':
      return <HodDashboard />;
    case 'ACCOUNTANT':
      return <AccountantDashboard />;
    case 'EXAM_OFFICER':
      return <ExamOfficerDashboard />;
    case 'LECTURER':
      return <TertiaryLecturerDashboard />;
    case 'TEACHER':
      return <TeacherDashboard />;
    case 'PARENT':
      return <ParentDashboard />;
    case 'STUDENT':
      if (isTertiaryStudent) {
        return <TertiaryStudentDashboard />;
      }
      return <SecondaryStudentDashboard />;
    default:
      return (
        <div className="p-8 text-center text-muted-foreground">
          {language === 'ar' 
            ? 'الدور غير صالح أو أن لوحة التحكم قيد الإنشاء. يرجى تسجيل الخروج والمحاولة مجدداً.' 
            : 'Invalid role or dashboard not yet implemented. Please log out and try again.'}
        </div>
      );
  }
}
