
'use client';

import { useRole } from '@/context/role-context';
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
  () => import('./slt/page').then(mod => mod.default),
  { loading: () => <DashboardSkeleton />, ssr: false }
);
const AccountantDashboard = dynamic(
  () => import('./accountant/page').then(mod => mod.default),
  { loading: () => <DashboardSkeleton />, ssr: false }
);
const TeacherDashboard = dynamic(
  () => import('@/components/dashboard/teacher/teacher-dashboard').then(mod => mod.TeacherDashboard),
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

export default function DashboardPage() {
  const { role, isLoading } = useRole();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // Switch based on the standardized uppercase user role
  switch (role) {
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
    case 'TEACHER':
      return <TeacherDashboard />;
    case 'PARENT':
    case 'STUDENT': // Standardized roles; students map to the parent dashboard for now
      return <ParentDashboard />;
    default:
      return <div>Invalid role or dashboard not yet implemented. Please log out and try again.</div>;
  }
}
