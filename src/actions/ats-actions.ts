"use server";

import { prisma } from "@/lib/prisma";

export async function getAtsData() {
  try {
    const jobPostings = await prisma.jobPosting.findMany({
      include: {
        department: true,
      }
    });
    
    const jobApplications = await prisma.jobApplication.findMany({
      include: {
        job: true,
      }
    });
    
    const interviews = await prisma.interview.findMany({
      include: {
        application: {
          include: {
            job: true,
          }
        },
        interviewer: true,
      }
    });

    const departments = await prisma.department.findMany();

    return {
      success: true,
      data: {
        jobPostings,
        jobApplications,
        interviews,
        departments,
      },
    };
  } catch (error) {
    console.error("Failed to fetch ATS data:", error);
    return { success: false, error: "Failed to fetch ATS data" };
  }
}

export async function createJobPosting(data: {
  title: string;
  departmentId: string;
  description: string;
  requirements: string;
  deadline: string;
}) {
  try {
    const job = await prisma.jobPosting.create({
      data: {
        title: data.title,
        departmentId: data.departmentId,
        description: data.description,
        requirements: data.requirements,
        deadline: new Date(data.deadline),
      },
    });
    return { success: true, data: job };
  } catch (error) {
    console.error("Failed to create job posting:", error);
    return { success: false, error: "Failed to create job posting" };
  }
}

export async function updateApplicationStatus(id: string, status: string) {
  try {
    const updated = await prisma.jobApplication.update({
      where: { id },
      data: { status },
    });
    return { success: true, data: updated };
  } catch (error) {
    console.error("Failed to update status:", error);
    return { success: false, error: "Failed to update status" };
  }
}

