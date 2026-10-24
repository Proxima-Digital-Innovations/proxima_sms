'use server';

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
      email: 'admin@proximahub.com',
      passwordDescription: 'password123 / Password123!',
      description: 'Full system oversight, institutional module toggling, user management & database ledger.',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
    },
    {
      role: 'PARENT',
      label: 'Parent / Guardian',
      email: 'parent@proximahub.com',
      passwordDescription: 'password123',
      description: 'Fund Parent Tuition Wallet, settle ward invoices in installments, and inspect report cards.',
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
    },
    {
      role: 'LECTURER',
      label: 'Tertiary Lecturer (TIMS)',
      email: 'aliyu.sani@proxima.edu.ng',
      passwordDescription: 'password123',
      description: 'University Lecturer Teaching Studio, course offerings, CBT exam authoring & anonymous grading.',
      badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    },
    {
      role: 'TEACHER',
      label: 'Secondary School Teacher',
      email: 'teacher@proximahub.com',
      passwordDescription: 'password123',
      description: 'Secondary & Basic School lesson plans, CA/exam score entry, Tahfeez & behavioural grading.',
      badgeColor: 'bg-sky-100 text-sky-800 border-sky-300',
    },
    {
      role: 'STUDENT',
      label: 'Tertiary Student (Undergrad)',
      email: 'U2025/CSC/001',
      passwordDescription: 'password123',
      description: 'Course registration, proctored CBT exams, hostel booking, QR docket, transcript & diploma.',
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    },
    {
      role: 'SECONDARY_STUDENT',
      label: 'Secondary School Student',
      email: 'student1@school.edu',
      passwordDescription: 'password123',
      description: 'High school terminal results, class timetable, LMS assignments, quizzes & e-Library.',
      badgeColor: 'bg-teal-100 text-teal-800 border-teal-300',
    },
    {
      role: 'ACCOUNTANT',
      label: 'Bursar / Accountant',
      email: 'finance@proximahub.com',
      passwordDescription: 'password123',
      description: 'Financial ledger reconciliation, tuition verification, and bursary exam clearance.',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    },
    {
      role: 'HOD',
      label: 'HOD / Senate Member',
      email: 'hod@proxima.com',
      passwordDescription: 'password123',
      description: 'Departmental oversight, Senate broadsheet review, and academic clearance approval.',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
    },
    {
      role: 'EXAM_OFFICER',
      label: 'Chief Exam Officer',
      email: 'exam@proxima.com',
      passwordDescription: 'password123',
      description: 'Candidate CIN token generation, blind score entry, and exam docket scheduling.',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    },
  ];

  return { success: true, personas };
}
