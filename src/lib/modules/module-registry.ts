import { prisma } from '@/lib/prisma';

export interface SystemModule {
  id: string;
  name: string;
  description: string;
  category: 'INSTITUTION' | 'ACADEMICS' | 'OPERATIONS';
  icon: string;
  defaultEnabled: boolean;
}

export const AVAILABLE_MODULES: SystemModule[] = [
  {
    id: 'TERTIARY_INSTITUTION',
    name: 'Tertiary Institution (TIMS)',
    description: 'Degree programs, courses, credit registration, anonymous exam tokens, Senate broadsheets, and GPA/CGPA grading.',
    category: 'INSTITUTION',
    icon: 'GraduationCap',
    defaultEnabled: true,
  },
  {
    id: 'SECONDARY_SCHOOL',
    name: 'Secondary & Basic School',
    description: 'K-12 classes, terms, broadsheets, report cards, Tahfeez evaluation, and continuous assessments.',
    category: 'INSTITUTION',
    icon: 'School',
    defaultEnabled: true,
  },
  {
    id: 'E_LIBRARY',
    name: 'e-Library & Repository',
    description: 'Digital textbooks, research papers, lecture materials, past questions, and circulation loan records.',
    category: 'ACADEMICS',
    icon: 'BookOpen',
    defaultEnabled: true,
  },
  {
    id: 'FINANCE',
    name: 'Finance & Bursary',
    description: 'Tuition fees, payment invoices, receipts, expenses, journal entries, and staff payroll.',
    category: 'OPERATIONS',
    icon: 'Wallet',
    defaultEnabled: true,
  },
  {
    id: 'HR',
    name: 'Human Resources & Staff',
    description: 'Staff directory, departments, contracts, recruitment, and leave management.',
    category: 'OPERATIONS',
    icon: 'Users',
    defaultEnabled: true,
  },
  {
    id: 'BAS_BIOMETRICS',
    name: 'Biometric Attendance (BAS)',
    description: 'Hardware kiosk clock-in, fingerprint/face enrollment, grace periods, and shift rosters.',
    category: 'OPERATIONS',
    icon: 'Fingerprint',
    defaultEnabled: true,
  },
  {
    id: 'LMS',
    name: 'Learning Management (LMS)',
    description: 'Digital course modules, lesson notes submission, assignments, and curriculum tracking.',
    category: 'ACADEMICS',
    icon: 'FileText',
    defaultEnabled: true,
  },
  {
    id: 'CBT',
    name: 'Computer-Based Testing (CBT)',
    description: 'Online examination engine, automated grading, question banks, and candidate timers.',
    category: 'ACADEMICS',
    icon: 'HelpCircle',
    defaultEnabled: true,
  },
  {
    id: 'HOSTEL',
    name: 'Hostel & Bedspace Allocation',
    description: 'Halls of residence, room inventory, gender segregation, real-time bedspace booking, and porter check-in clearance.',
    category: 'OPERATIONS',
    icon: 'Building',
    defaultEnabled: true,
  },
];

export const DEFAULT_ACTIVE_MODULES = AVAILABLE_MODULES.map((m) => m.id);

/**
 * Fetch list of currently enabled modules from the institutional SystemProfile.
 */
export async function getActiveInstitutionalModules(): Promise<string[]> {
  try {
    const profile = await prisma.systemProfile.findFirst({
      select: { enabledModules: true },
    });

    if (profile?.enabledModules) {
      const parsed = JSON.parse(profile.enabledModules);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading institutional modules:', err);
  }

  return DEFAULT_ACTIVE_MODULES;
}
