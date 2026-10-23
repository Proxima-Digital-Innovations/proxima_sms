import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// ============================================================================
// NIGERIAN TERTIARY ADMISSIONS STANDARDS & SCORING MATRICES
// ============================================================================

export const OLEVEL_POINT_MATRIX: Record<string, number> = {
  A1: 8,
  B2: 7,
  B3: 6,
  C4: 5,
  C5: 4,
  C6: 3,
  D7: 0,
  E8: 0,
  F9: 0,
};

// Educationally Less Developed States (ELDS) recognized under Federal Character guidelines
export const ELDS_STATES = [
  'ADAMAWA',
  'BAUCHI',
  'BAYELSA',
  'BENUE',
  'BORNO',
  'CROSS RIVER',
  'EBONYI',
  'GOMBE',
  'JIGAWA',
  'KADUNA',
  'KANO',
  'KATSINA',
  'KEBBI',
  'KOGI',
  'KWARA',
  'NASARAWA',
  'NIGER',
  'PLATEAU',
  'RIVERS',
  'SOKOTO',
  'TARABA',
  'YOBE',
  'ZAMFARA',
];

// Institutional default catchment states (North-West / North-Central region for Proxima)
export const CATCHMENT_STATES = [
  'KANO',
  'KADUNA',
  'JIGAWA',
  'KATSINA',
  'BAUCHI',
  'ZAMFARA',
  'SOKOTO',
];

export interface OLevelSubjectGrade {
  subject: string;
  grade: string;
  points?: number;
}

export interface ApplicantSubmissionDTO {
  campaignId: string;
  jambRegNumber: string;
  mode: 'UTME' | 'DIRECT_ENTRY' | 'TRANSFER';
  firstName: string;
  lastName: string;
  otherNames?: string;
  email: string;
  phone: string;
  gender: string;
  dateOfBirth: string;
  stateOfOrigin: string;
  lga: string;
  passportPhotoUrl?: string;
  deInstitution?: string;
  deQualification?: string;
  deGradeOrCgpa?: string;
  firstChoiceId: string;
  secondChoiceId?: string;
  jambScore: number;
  jambSubjects: { subject: string; score: number }[];
  oLevelSittings: {
    examBody: 'WAEC' | 'NECO' | 'NABTEB' | 'CAMBRIDGE';
    examYear: number;
    examCenterNumber: string;
    candidateNumber: string;
    scratchCardPin?: string;
    scratchCardSerial?: string;
    sittingNumber: number;
    grades: OLevelSubjectGrade[];
  }[];
}

export class AdmissionService {
  /**
   * Calculate O'Level Points from submitted sittings (Max 2 sittings, top 5 relevant passes)
   */
  public static calculateOLevelPoints(
    sittings: { grades: OLevelSubjectGrade[] }[]
  ): { points: number; creditsCount: number; passedEngAndMaths: boolean } {
    const allGrades: { subject: string; grade: string; points: number }[] = [];

    for (const sitting of sittings) {
      for (const g of sitting.grades) {
        const normalizedGrade = g.grade.toUpperCase().trim();
        const pt = OLEVEL_POINT_MATRIX[normalizedGrade] ?? 0;
        allGrades.push({
          subject: g.subject.trim(),
          grade: normalizedGrade,
          points: pt,
        });
      }
    }

    // Keep best grade per unique subject if combined from 2 sittings
    const bestBySubject = new Map<string, { grade: string; points: number }>();
    for (const item of allGrades) {
      const key = item.subject.toLowerCase();
      const existing = bestBySubject.get(key);
      if (!existing || item.points > existing.points) {
        bestBySubject.set(key, { grade: item.grade, points: item.points });
      }
    }

    // Check mandatory English Language and Mathematics
    let hasEnglish = false;
    let hasMaths = false;
    for (const [subj, data] of bestBySubject.entries()) {
      if (subj.includes('english') && data.points >= 3) hasEnglish = true;
      if (subj.includes('math') && data.points >= 3) hasMaths = true;
    }

    // Sort all subject points descending
    const sortedPoints = Array.from(bestBySubject.values())
      .map((x) => x.points)
      .sort((a, b) => b - a);

    // Take top 5 subjects (Max score 5 * 8 = 40 points)
    const top5 = sortedPoints.slice(0, 5);
    const totalPoints = top5.reduce((sum, p) => sum + p, 0);
    const creditsCount = sortedPoints.filter((p) => p >= 3).length;

    return {
      points: totalPoints,
      creditsCount,
      passedEngAndMaths: hasEnglish && hasMaths,
    };
  }

  /**
   * Compute Composite Aggregate Score:
   * Option A (With CBT): (JAMB/400 * 50) + (Post-UTME/100 * 30) + (OLevel/40 * 20)
   * Option B (Credential Aggregate): (JAMB/400 * 60) + (OLevel/40 * 40)
   */
  public static calculateCompositeScore(
    jambScore: number,
    oLevelPoints: number,
    postUtmeScore?: number | null,
    screeningMethod: 'CBT_EXAM' | 'CREDENTIAL_AGGREGATE' = 'CREDENTIAL_AGGREGATE'
  ): number {
    const clampedJamb = Math.min(Math.max(jambScore, 0), 400);
    const clampedOlevel = Math.min(Math.max(oLevelPoints, 0), 40);

    if (screeningMethod === 'CBT_EXAM' && postUtmeScore !== undefined && postUtmeScore !== null) {
      const clampedPutme = Math.min(Math.max(postUtmeScore, 0), 100);
      const jambWeight = (clampedJamb / 400) * 50;
      const putmeWeight = (clampedPutme / 100) * 30;
      const olevelWeight = (clampedOlevel / 40) * 20;
      return Number((jambWeight + putmeWeight + olevelWeight).toFixed(2));
    } else {
      // Credential Aggregate mode: 60% JAMB + 40% O'Level points
      const jambWeight = (clampedJamb / 400) * 60;
      const olevelWeight = (clampedOlevel / 40) * 40;
      return Number((jambWeight + olevelWeight).toFixed(2));
    }
  }

  /**
   * Determine Statutory Quota Category
   */
  public static determineQuotaCategory(
    stateOfOrigin: string,
    isMeritEligible: boolean
  ): 'MERIT' | 'CATCHMENT' | 'ELDS' | 'DISCRETIONARY' {
    if (isMeritEligible) return 'MERIT';
    const normalizedState = stateOfOrigin.toUpperCase().trim();
    if (CATCHMENT_STATES.includes(normalizedState)) return 'CATCHMENT';
    if (ELDS_STATES.includes(normalizedState)) return 'ELDS';
    return 'DISCRETIONARY';
  }

  /**
   * Generate Application Number: PROX/ADM/2025/00001
   */
  public static async generateApplicationNumber(sessionYear = new Date().getFullYear()): Promise<string> {
    const count = await prisma.admissionApplicant.count();
    const seq = (count + 1).toString().padStart(5, '0');
    return `PROX/ADM/${sessionYear}/${seq}`;
  }

  /**
   * Get or initialize the active admission campaign
   */
  public static async getActiveCampaign() {
    let campaign = await prisma.admissionCampaign.findFirst({
      where: { isActive: true },
      include: {
        academicSession: true,
        batches: true,
        cutOffs: {
          include: { program: true },
        },
      },
    });

    if (!campaign) {
      // Find or create an academic session
      let session = await prisma.academicSession.findFirst({ where: { isActive: true } });
      if (!session) {
        session = await prisma.academicSession.findFirst({ orderBy: { createdAt: 'desc' } });
      }

      if (!session) {
        session = await prisma.academicSession.create({
          data: {
            name: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
            startDate: new Date(),
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            isActive: true,
          },
        });
      }

      // Create initial campaign
      campaign = await prisma.admissionCampaign.create({
        data: {
          academicSessionId: session.id,
          title: `${session.name} Undergraduate Admissions Campaign`,
          startDate: new Date(),
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          applicationFee: 2000.0,
          acceptanceFee: 50000.0,
          screeningMethod: 'CREDENTIAL_AGGREGATE',
          isActive: true,
        },
        include: {
          academicSession: true,
          batches: true,
          cutOffs: {
            include: { program: true },
          },
        },
      });

      // Populate default cut-offs for all academic programs
      const programs = await prisma.academicProgram.findMany();
      for (const prog of programs) {
        await prisma.departmentalCutOff.create({
          data: {
            campaignId: campaign.id,
            programId: prog.id,
            minJambScore: prog.code.includes('CSC') || prog.code.includes('ENG') ? 180 : 160,
            minCompositeScore: 50.0,
            meritQuota: 50,
            catchmentQuota: 35,
            eldsQuota: 15,
          },
        });
      }

      // Re-fetch with cutoffs
      campaign = await prisma.admissionCampaign.findUnique({
        where: { id: campaign.id },
        include: {
          academicSession: true,
          batches: true,
          cutOffs: {
            include: { program: true },
          },
        },
      });
    }

    return campaign;
  }

  /**
   * Submit an applicant
   */
  public static async registerApplicant(dto: ApplicantSubmissionDTO) {
    // 1. Check for duplicate application
    const existing = await prisma.admissionApplicant.findFirst({
      where: {
        OR: [{ jambRegNumber: dto.jambRegNumber }, { email: dto.email }],
      },
    });

    if (existing) {
      throw new Error(`An application already exists for JAMB Registration Number ${dto.jambRegNumber} or email ${dto.email}.`);
    }

    // 2. Fetch campaign
    const campaign = await prisma.admissionCampaign.findUnique({
      where: { id: dto.campaignId },
    });

    if (!campaign || !campaign.isActive) {
      throw new Error('The selected admissions campaign is inactive or closed.');
    }

    // 3. Calculate O'Level points & composite score
    const oLevelEval = this.calculateOLevelPoints(dto.oLevelSittings);
    const compositeScore = this.calculateCompositeScore(
      dto.jambScore,
      oLevelEval.points,
      null,
      campaign.screeningMethod
    );

    const appNumber = await this.generateApplicationNumber();

    // 4. Create applicant with sittings inside transaction
    const applicant = await prisma.$transaction(async (tx) => {
      const created = await tx.admissionApplicant.create({
        data: {
          campaignId: dto.campaignId,
          applicationNumber: appNumber,
          jambRegNumber: dto.jambRegNumber.toUpperCase().trim(),
          mode: dto.mode,
          firstName: dto.firstName,
          lastName: dto.lastName,
          otherNames: dto.otherNames,
          email: dto.email.toLowerCase().trim(),
          phone: dto.phone.trim(),
          gender: dto.gender,
          dateOfBirth: new Date(dto.dateOfBirth),
          stateOfOrigin: dto.stateOfOrigin,
          lga: dto.lga,
          passportPhotoUrl: dto.passportPhotoUrl,
          deInstitution: dto.deInstitution,
          deQualification: dto.deQualification,
          deGradeOrCgpa: dto.deGradeOrCgpa,
          firstChoiceId: dto.firstChoiceId,
          secondChoiceId: dto.secondChoiceId,
          jambScore: dto.jambScore,
          jambSubjects: dto.jambSubjects,
          oLevelAggregate: oLevelEval.points,
          compositeScore: compositeScore,
          status: 'APPLIED',
          applicationFeePaid: true, // Demo flag / marked paid for immediate processing
        },
      });

      // Create O'Level records
      for (const sitting of dto.oLevelSittings) {
        await tx.applicantOLevel.create({
          data: {
            applicantId: created.id,
            examBody: sitting.examBody,
            examYear: sitting.examYear,
            examCenterNumber: sitting.examCenterNumber,
            candidateNumber: sitting.candidateNumber,
            scratchCardPin: sitting.scratchCardPin,
            scratchCardSerial: sitting.scratchCardSerial,
            sittingNumber: sitting.sittingNumber,
            grades: sitting.grades,
            isVerified: true,
          },
        });
      }

      return created;
    });

    return applicant;
  }

  /**
   * Record Post-UTME CBT exam score and recompute composite
   */
  public static async recordPostUtmeScore(applicantId: string, score: number) {
    const applicant = await prisma.admissionApplicant.findUnique({
      where: { id: applicantId },
      include: { campaign: true },
    });

    if (!applicant) throw new Error('Applicant not found.');

    const oLevelPoints = applicant.oLevelAggregate ?? 0;
    const composite = this.calculateCompositeScore(
      applicant.jambScore,
      oLevelPoints,
      score,
      applicant.campaign.screeningMethod
    );

    return prisma.admissionApplicant.update({
      where: { id: applicantId },
      data: {
        postUtmeScore: score,
        compositeScore: composite,
        status: 'SCREENED',
      },
    });
  }

  /**
   * Quota & Senate Evaluation Engine:
   * Rank all applicants for a program and categorize into Merit, Catchment, ELDS
   */
  public static async rankProgramApplicants(campaignId: string, programId: string) {
    const cutOff = await prisma.departmentalCutOff.findUnique({
      where: { campaignId_programId: { campaignId, programId } },
    });

    const applicants = await prisma.admissionApplicant.findMany({
      where: {
        campaignId,
        firstChoiceId: programId,
      },
      include: {
        firstChoice: true,
        oLevelResults: true,
        offerLetter: true,
      },
      orderBy: [{ compositeScore: 'desc' }, { jambScore: 'desc' }],
    });

    const minJamb = cutOff?.minJambScore ?? 160;
    const minComp = cutOff?.minCompositeScore ?? 50.0;

    // Filter qualified applicants
    const qualified = applicants.filter(
      (a) => (a.compositeScore ?? 0) >= minComp && a.jambScore >= minJamb
    );

    // Merit Quota (45%)
    const totalCapacity = (cutOff?.meritQuota ?? 50) + (cutOff?.catchmentQuota ?? 35) + (cutOff?.eldsQuota ?? 15);
    const meritCapacity = Math.round(totalCapacity * 0.45);
    const catchmentCapacity = Math.round(totalCapacity * 0.35);
    const eldsCapacity = Math.round(totalCapacity * 0.20);

    const meritList = qualified.slice(0, meritCapacity).map((a) => ({
      ...a,
      assignedQuota: 'MERIT' as const,
    }));

    const meritIds = new Set(meritList.map((a) => a.id));
    const remaining = qualified.filter((a) => !meritIds.has(a.id));

    // Catchment Quota (35%)
    const catchmentCandidates = remaining.filter((a) =>
      CATCHMENT_STATES.includes(a.stateOfOrigin.toUpperCase().trim())
    );
    const catchmentList = catchmentCandidates.slice(0, catchmentCapacity).map((a) => ({
      ...a,
      assignedQuota: 'CATCHMENT' as const,
    }));
    const catchmentIds = new Set(catchmentList.map((a) => a.id));

    // ELDS Quota (20%)
    const remainingForElds = remaining.filter((a) => !catchmentIds.has(a.id));
    const eldsCandidates = remainingForElds.filter((a) =>
      ELDS_STATES.includes(a.stateOfOrigin.toUpperCase().trim())
    );
    const eldsList = eldsCandidates.slice(0, eldsCapacity).map((a) => ({
      ...a,
      assignedQuota: 'ELDS' as const,
    }));

    return {
      totalApplicants: applicants.length,
      qualifiedCount: qualified.length,
      meritList,
      catchmentList,
      eldsList,
      allApplicants: applicants,
      cutOff,
    };
  }

  /**
   * Publish an Admission Batch with cryptographic provisional letters
   */
  public static async publishAdmissionBatch(
    campaignId: string,
    batchName: string,
    batchNumber: number,
    admissions: { applicantId: string; programId: string; quota: 'MERIT' | 'CATCHMENT' | 'ELDS' | 'DISCRETIONARY' }[]
  ) {
    return prisma.$transaction(async (tx) => {
      // Create or find batch
      const batch = await tx.admissionBatch.create({
        data: {
          campaignId,
          batchName,
          batchNumber,
          isPublished: true,
          publishedAt: new Date(),
        },
      });

      const offers: any[] = [];
      const deadline = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days acceptance deadline

      for (const item of admissions) {
        // Generate cryptographic letter code
        const hash = crypto.randomBytes(4).toString('hex').toUpperCase();
        const letterCode = `PROX-OFFER-${new Date().getFullYear()}-${hash}`;

        // Update applicant status
        await tx.admissionApplicant.update({
          where: { id: item.applicantId },
          data: {
            status: 'PROVISIONALLY_ADMITTED',
            admittedProgramId: item.programId,
            batchId: batch.id,
            quotaCategory: item.quota,
            jambCapsStatus: 'RECOMMENDED_TO_JAMB',
          },
        });

        // Create Admission Offer
        const offer = await tx.admissionOffer.create({
          data: {
            applicantId: item.applicantId,
            batchId: batch.id,
            provisionalLetterCode: letterCode,
            acceptanceDeadline: deadline,
          },
        });

        offers.push(offer);
      }

      return { batch, offersCount: offers.length };
    });
  }

  /**
   * Candidate Accepts Admission & Pays Acceptance Fee
   */
  public static async acceptAdmissionOffer(provisionalLetterCode: string) {
    const offer = await prisma.admissionOffer.findUnique({
      where: { provisionalLetterCode },
      include: {
        applicant: {
          include: {
            admittedProgram: true,
            campaign: true,
          },
        },
      },
    });

    if (!offer) throw new Error('Invalid provisional admission letter verification code.');
    if (offer.isAccepted) throw new Error('This admission offer has already been accepted.');
    if (new Date() > offer.acceptanceDeadline) {
      throw new Error('The acceptance deadline for this provisional offer has elapsed.');
    }

    return prisma.$transaction(async (tx) => {
      const updatedOffer = await tx.admissionOffer.update({
        where: { id: offer.id },
        data: {
          isAccepted: true,
          acceptedAt: new Date(),
        },
      });

      await tx.admissionApplicant.update({
        where: { id: offer.applicantId },
        data: {
          status: 'OFFER_ACCEPTED',
          acceptanceFeePaid: true,
          jambCapsStatus: 'ACCEPTED_BY_CANDIDATE',
        },
      });

      return updatedOffer;
    });
  }

  /**
   * 1-Click Matriculation: Transitions Accepted Candidate to Full StudentProfile & LMS
   */
  public static async matriculateApplicant(applicantId: string) {
    const applicant = await prisma.admissionApplicant.findUnique({
      where: { id: applicantId },
      include: {
        admittedProgram: true,
        offerLetter: true,
      },
    });

    if (!applicant) throw new Error('Applicant not found.');
    if (applicant.status !== 'OFFER_ACCEPTED' && applicant.status !== 'PROVISIONALLY_ADMITTED') {
      throw new Error(`Cannot matriculate candidate with current status: ${applicant.status}. Offer must be accepted first.`);
    }

    if (!applicant.admittedProgramId || !applicant.admittedProgram) {
      throw new Error('Candidate has no admitted program assigned.');
    }

    // Determine level: 100 for UTME, 200 for DIRECT_ENTRY
    const entryLevel = applicant.mode === 'DIRECT_ENTRY' ? 200 : 100;
    const year = new Date().getFullYear();
    const progCode = applicant.admittedProgram.code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

    return prisma.$transaction(async (tx) => {
      // 1. Generate unique Matriculation Number: e.g. U2025/CSC/042
      const existingInProgram = await tx.studentProfile.count({
        where: { programId: applicant.admittedProgramId! },
      });
      const matricSeq = (existingInProgram + 1).toString().padStart(3, '0');
      const matricNumber = `U${year}/${progCode}/${matricSeq}`;

      // 2. Create User record for student portal
      const user = await tx.user.create({
        data: {
          email: applicant.email,
          name: `${applicant.firstName} ${applicant.lastName}`,
          role: 'STUDENT',
          password: 'password123', // Default institutional password, prompt change on first login
        },
      });

      // 3. Create StudentProfile
      const profile = await tx.studentProfile.create({
        data: {
          userId: user.id,
          matricNumber,
          programId: applicant.admittedProgramId!,
          currentLevel: entryLevel,
        },
      });

      // 4. Update applicant status and link to offer
      await tx.admissionApplicant.update({
        where: { id: applicantId },
        data: {
          status: 'MATRICULATED',
        },
      });

      if (applicant.offerLetter) {
        await tx.admissionOffer.update({
          where: { id: applicant.offerLetter.id },
          data: {
            matricNumberAssigned: matricNumber,
            studentProfileId: profile.id,
          },
        });
      }

      return {
        user,
        profile,
        matricNumber,
      };
    });
  }
}
