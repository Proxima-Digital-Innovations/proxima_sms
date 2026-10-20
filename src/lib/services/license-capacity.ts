import { prisma } from '@/lib/prisma';

export type CapacityZone = 'NORMAL' | 'GRACE_BUFFER' | 'OVER_CAPACITY';

export interface LicenseCapacityStatus {
  activeStudents: number;
  licensedLimit: number;
  gracePercentage: number;
  graceBufferLimit: number;
  availableRegularSlots: number;
  availableGraceSlots: number;
  usagePercent: number;
  zone: CapacityZone;
  billingFrequency: 'PER_TERM' | 'PER_SESSION';
  discountPercent: number;
  expiresAt: Date | null;
  nextRenewalDate: Date | null;
  status: string;
  schoolName: string;
  tier: string;
  isExpired: boolean;
  statusMessage: string;
}

export interface AdmissionCheckResult {
  allowed: boolean;
  willEnterGrace: boolean;
  willExceedGrace: boolean;
  currentActive: number;
  licensedLimit: number;
  graceBufferLimit: number;
  resultingTotal: number;
  message: string;
}

const DEFAULT_MAX_STUDENTS = 500;
const GRACE_BUFFER_MULTIPLIER = 0.15; // 15% soft buffer

export async function getLicenseCapacityStatus(): Promise<LicenseCapacityStatus> {
  // 1. Count active students strictly (exclude withdrawn, graduated, alumni)
  const activeStudents = await prisma.student.count({
    where: {
      status: { in: ['Active', 'ACTIVE'] },
    },
  });

  // 2. Fetch latest system license
  const license = await prisma.systemLicense.findFirst({
    orderBy: { createdAt: 'desc' },
  });

  const licensedLimit = license?.maxStudents ?? DEFAULT_MAX_STUDENTS;
  const graceBufferLimit = Math.floor(licensedLimit * (1 + GRACE_BUFFER_MULTIPLIER));
  const availableRegularSlots = Math.max(0, licensedLimit - activeStudents);
  const availableGraceSlots = Math.max(0, graceBufferLimit - activeStudents);
  const usagePercent = licensedLimit > 0 ? Math.round((activeStudents / licensedLimit) * 100) : 100;

  let zone: CapacityZone = 'NORMAL';
  let statusMessage = `Operating normally (${activeStudents}/${licensedLimit} active students).`;

  if (activeStudents > graceBufferLimit) {
    zone = 'OVER_CAPACITY';
    statusMessage = `License limit exceeded (${activeStudents}/${licensedLimit} students). Admissions are locked until subscription is upgraded.`;
  } else if (activeStudents > licensedLimit) {
    zone = 'GRACE_BUFFER';
    const excess = activeStudents - licensedLimit;
    statusMessage = `Operating in Grace Buffer (+${excess} students). Valid through current term. Tier adjustment will occur at next renewal.`;
  }

  const isExpired = license?.expiresAt ? new Date(license.expiresAt) < new Date() : false;

  return {
    activeStudents,
    licensedLimit,
    gracePercentage: 15,
    graceBufferLimit,
    availableRegularSlots,
    availableGraceSlots,
    usagePercent,
    zone,
    billingFrequency: (license?.billingFrequency as any) || 'PER_TERM',
    discountPercent: license?.discountPercent || 0,
    expiresAt: license?.expiresAt || null,
    nextRenewalDate: license?.nextRenewalDate || null,
    status: license?.status || 'ACTIVE',
    schoolName: license?.schoolName || 'Proxima Academy',
    tier: license?.tier || 'BASIC',
    isExpired,
    statusMessage,
  };
}

export async function canAdmitStudents(count: number = 1): Promise<AdmissionCheckResult> {
  const capacity = await getLicenseCapacityStatus();
  const resultingTotal = capacity.activeStudents + count;

  // Case 1: Within regular licensed limit
  if (resultingTotal <= capacity.licensedLimit) {
    return {
      allowed: true,
      willEnterGrace: false,
      willExceedGrace: false,
      currentActive: capacity.activeStudents,
      licensedLimit: capacity.licensedLimit,
      graceBufferLimit: capacity.graceBufferLimit,
      resultingTotal,
      message: 'Within licensed capacity.',
    };
  }

  // Case 2: Within +15% grace buffer (Soft Cap)
  if (resultingTotal <= capacity.graceBufferLimit) {
    const excess = resultingTotal - capacity.licensedLimit;
    return {
      allowed: true,
      willEnterGrace: true,
      willExceedGrace: false,
      currentActive: capacity.activeStudents,
      licensedLimit: capacity.licensedLimit,
      graceBufferLimit: capacity.graceBufferLimit,
      resultingTotal,
      message: `Admission permitted via Grace Buffer (+${excess} over ${capacity.licensedLimit}). Billed at next term renewal.`,
    };
  }

  // Case 3: Exceeds grace buffer (Hard Stop)
  return {
    allowed: false,
    willEnterGrace: false,
    willExceedGrace: true,
    currentActive: capacity.activeStudents,
    licensedLimit: capacity.licensedLimit,
    graceBufferLimit: capacity.graceBufferLimit,
    resultingTotal,
    message: `License capacity exceeded: Admitting ${count} student(s) would bring total active students to ${resultingTotal}, exceeding your licensed limit (${capacity.licensedLimit}) plus the 15% grace buffer (${capacity.graceBufferLimit}). Please upgrade your subscription tier to continue admissions.`,
  };
}

export async function snapshotTermBaseline(termId: string, currentActiveCount?: number) {
  const activeCount = currentActiveCount !== undefined
    ? currentActiveCount
    : await prisma.student.count({ where: { status: { in: ['Active', 'ACTIVE'] } } });

  const license = await prisma.systemLicense.findFirst({
    orderBy: { createdAt: 'desc' },
  });

  if (license) {
    await prisma.systemLicense.update({
      where: { id: license.id },
      data: {
        startingStudentCount: activeCount,
        currentTermId: termId,
      },
    });
  }

  return { success: true, startingStudentCount: activeCount, termId };
}
