'use server';

import { prisma } from '@/lib/prisma';
import { AdmissionService, ApplicantSubmissionDTO } from '@/lib/services/admission-service';
import { revalidatePath } from 'next/cache';

export async function getActiveCampaignAction() {
  try {
    const campaign = await AdmissionService.getActiveCampaign();
    return { success: true, data: campaign };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function submitApplicationAction(dto: ApplicantSubmissionDTO) {
  try {
    const applicant = await AdmissionService.registerApplicant(dto);
    revalidatePath('/dashboard/admissions');
    return { success: true, data: applicant };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function recordPostUtmeScoreAction(applicantId: string, score: number) {
  try {
    const updated = await AdmissionService.recordPostUtmeScore(applicantId, score);
    revalidatePath('/dashboard/admissions');
    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getProgramRankingsAction(campaignId: string, programId: string) {
  try {
    const ranking = await AdmissionService.rankProgramApplicants(campaignId, programId);
    return { success: true, data: ranking };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateDepartmentalCutOffAction(
  cutOffId: string,
  minJambScore: number,
  minCompositeScore: number,
  meritQuota: number,
  catchmentQuota: number,
  eldsQuota: number
) {
  try {
    const updated = await prisma.departmentalCutOff.update({
      where: { id: cutOffId },
      data: {
        minJambScore,
        minCompositeScore,
        meritQuota,
        catchmentQuota,
        eldsQuota,
      },
    });
    revalidatePath('/dashboard/admissions');
    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function publishAdmissionBatchAction(
  campaignId: string,
  batchName: string,
  batchNumber: number,
  admissions: { applicantId: string; programId: string; quota: 'MERIT' | 'CATCHMENT' | 'ELDS' | 'DISCRETIONARY' }[]
) {
  try {
    const result = await AdmissionService.publishAdmissionBatch(campaignId, batchName, batchNumber, admissions);
    revalidatePath('/dashboard/admissions');
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function checkAdmissionStatusAction(jambRegNumber: string) {
  try {
    const applicant = await prisma.admissionApplicant.findFirst({
      where: { jambRegNumber: jambRegNumber.toUpperCase().trim() },
      include: {
        firstChoice: true,
        admittedProgram: true,
        batch: true,
        offerLetter: true,
        oLevelResults: true,
      },
    });

    if (!applicant) {
      return { success: false, error: 'No application record found for this JAMB Registration Number.' };
    }

    return { success: true, data: applicant };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function acceptOfferAction(letterCode: string) {
  try {
    const result = await AdmissionService.acceptAdmissionOffer(letterCode);
    revalidatePath('/admissions/status');
    revalidatePath('/dashboard/admissions');
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function matriculateApplicantAction(applicantId: string) {
  try {
    const result = await AdmissionService.matriculateApplicant(applicantId);
    revalidatePath('/dashboard/admissions');
    revalidatePath('/dashboard/students');
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getJambCapsReconciliationData(campaignId: string) {
  try {
    const applicants = await prisma.admissionApplicant.findMany({
      where: { campaignId },
      include: {
        admittedProgram: true,
        firstChoice: true,
        batch: true,
      },
      orderBy: [{ jambScore: 'desc' }],
    });

    return { success: true, data: applicants };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
