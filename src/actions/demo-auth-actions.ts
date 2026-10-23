'use server';

import { prisma } from '@/lib/prisma';

export interface DemoPersona {
  role: string;
  label: string;
  email: string;
  passwordDescription: string;
  description: string;
  badgeColor: string;
}

export async function getDemoPersonas(): Promise<{ success: boolean; personas: DemoPersona[] }> {
  const personas: DemoPersona[] = [
    {
      role: 'ADMIN',
      label: 'Super Admin',
      email: 'admin@proxima.com',
      passwordDescription: 'Admin password from setup',
      description: 'Full system oversight, institutional module toggling, user management & database ledger.',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
    },
    {
      role: 'HOD',
      label: 'HOD / Senate Member',
      email: 'hod@proxima.com',
      passwordDescription: 'Same as default staff password',
      description: 'Departmental oversight, Senate broadsheet review, and academic clearance approval.',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
    },
    {
      role: 'EXAM_OFFICER',
      label: 'Chief Exam Officer',
      email: 'exam@proxima.com',
      passwordDescription: 'Same as default staff password',
      description: 'Candidate CIN token generation, blind score entry, and exam docket scheduling.',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    },
    {
      role: 'ACCOUNTANT',
      label: 'Bursar / Accountant',
      email: 'accountant@proxima.com',
      passwordDescription: 'Same as default staff password',
      description: 'Financial ledger reconciliation, tuition verification, and bursary exam clearance.',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    },
    {
      role: 'STUDENT',
      label: 'Tertiary Student (300L)',
      email: 'aminu.katsina@tims.edu.ng',
      passwordDescription: 'Student@2025',
      description: 'Course registration, take proctored CBT test, generate QR docket, transcript & diploma.',
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    },
  ];

  return { success: true, personas };
}
