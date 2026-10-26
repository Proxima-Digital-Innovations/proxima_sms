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
  {
    id: 'ADMISSIONS',
    name: 'University & Tertiary Admissions',
    description: 'Handles UTME/Direct Entry applications, Post-UTME screening, departmental cut-offs, merit lists, catchment quotas, JAMB CAPS workflow, and applicant portals.',
    category: 'INSTITUTION',
    icon: 'GraduationCap',
    defaultEnabled: true,
  },
];

export const DEFAULT_ACTIVE_MODULES = AVAILABLE_MODULES.map((m) => m.id);

const globalForModules = globalThis as unknown as {
  __activeModulesCache?: { modules: string[]; expiresAt: number } | null;
};

export function invalidateActiveModulesCache() {
  globalForModules.__activeModulesCache = null;
}

/**
 * Fetch list of currently enabled modules from the institutional SystemProfile
 * with a 15-second in-memory cache to eliminate redundant DB hits across layout/actions.
 */
export async function getActiveInstitutionalModules(): Promise<string[]> {
  const now = Date.now();
  if (globalForModules.__activeModulesCache && globalForModules.__activeModulesCache.expiresAt > now) {
    return globalForModules.__activeModulesCache.modules;
  }

  try {
    const profile = await prisma.systemProfile.findFirst({
      select: { enabledModules: true },
    });

    if (profile?.enabledModules) {
      const parsed = JSON.parse(profile.enabledModules);
      if (Array.isArray(parsed) && parsed.length > 0) {
        globalForModules.__activeModulesCache = {
          modules: parsed,
          expiresAt: now + 15000,
        };
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading institutional modules:', err);
  }

  globalForModules.__activeModulesCache = {
    modules: DEFAULT_ACTIVE_MODULES,
    expiresAt: now + 15000,
  };
  return DEFAULT_ACTIVE_MODULES;
}
