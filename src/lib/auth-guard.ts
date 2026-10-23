'use client';

import {
  Activity, BarChart2, Bell, Book, Building, Calendar, Wallet, LayoutDashboard, LogOut, MessageSquare, Server, Settings, Shield, User, Users,
  UsersRound, FileQuestion, BookCopy, Edit3, CheckSquare, Award, BookOpen, TrendingUp, Landmark, Briefcase, FileText, CreditCard,
  Receipt, Ticket, Grid, BookMarked, Wrench, GraduationCap, Sparkles, UploadCloud, CalendarCheck, Heart, ClipboardCheck, BookText, Megaphone,
  QrCode, FileSpreadsheet, ArrowLeftRight, Fingerprint, UserCheck, Presentation, FileEdit, HelpCircle
} from 'lucide-react';
import type { ElementType } from 'react';

export const iconMap: { [key: string]: ElementType } = {
  LayoutDashboard, User, Users, UsersRound, Building, Server, Activity, Book, FileText, BarChart2, BookOpen, Edit3, Wallet, Calendar, Bell, MessageSquare,
  FileQuestion, BookCopy, CheckSquare, Award, Shield, Settings, LogOut, TrendingUp, Landmark, Briefcase, Receipt, CreditCard, Ticket, Grid,
  BookMarked, Wrench, GraduationCap, Sparkles, UploadCloud, CalendarCheck, Heart, ClipboardCheck, BookText, Megaphone, QrCode, FileSpreadsheet,
  ArrowLeftRight, Fingerprint, UserCheck, Presentation, FileEdit, HelpCircle
};

export const allNavLinks: Record<string, { icon: string; label: string; path: string; requiredModule?: string; subLinks?: { label: string; path: string; requiredModule?: string }[] }> = {
  dashboard: { icon: 'LayoutDashboard', label: 'Dashboard', path: '/dashboard' },
  profile: { icon: 'User', label: 'Profile', path: '/dashboard/profile' },
  notifications: { icon: 'Bell', label: 'Notifications', path: '/dashboard/notifications' },
  messaging: { icon: 'MessageSquare', label: 'Messaging', path: '/dashboard/messaging' },
  announcements: { icon: 'Megaphone', label: 'Announcements', path: '/dashboard/announcements' },
  reports: { icon: 'TrendingUp', label: 'Reports & Analytics', path: '/dashboard/analytics' },
  system: { icon: 'Shield', label: 'System Config', path: '/dashboard/system',
    subLinks: [
      { label: 'School Info', path: '/dashboard/system/school-info' },
      { label: 'Module Settings', path: '/dashboard/system/modules' },
      { label: 'Grading', path: '/dashboard/system/grading', requiredModule: 'SECONDARY_SCHOOL' },
      { label: 'Academic Year', path: '/dashboard/system/academic-year' },
      { label: 'AI Settings', path: '/dashboard/system/ai-settings' },
      { label: 'Roles', path: '/dashboard/system/roles' },
      { label: 'Classes & Subjects', path: '/dashboard/system/classes-subjects', requiredModule: 'SECONDARY_SCHOOL' },
      { label: 'Subscription', path: '/dashboard/system/license' },
      { label: 'Maintenance', path: '/dashboard/system/maintenance' },
    ]
  },
  manageStaff: { icon: 'Users', label: 'Manage Staff', path: '/dashboard/users', requiredModule: 'HR' },
  manageStudents: { icon: 'UsersRound', label: 'Manage Students', path: '/dashboard/students' },
  departments: { icon: 'Building', label: 'Departments', path: '/dashboard/departments' },
  database: { icon: 'Server', label: 'Database', path: '/dashboard/db' },
  logs: { icon: 'Activity', label: 'Logs & Security', path: '/dashboard/logs' },
  lessonApprovals: { icon: 'Book', label: 'Lesson Approvals', path: '/dashboard/lesson-notes', requiredModule: 'LMS' },
  hodAnalytics: { icon: 'BarChart2', label: 'Dept. Analytics', path: '/dashboard/hod/analytics' },
  academicOverview: { icon: 'LineChart', label: 'Academic Oversight', path: '/dashboard/slt/academics' },
  lessonPlans: { icon: 'BookCopy', label: 'Lesson Plans', path: '/dashboard/lesson-notes', requiredModule: 'LMS' },
  examQuestions: { icon: 'FileQuestion', label: 'Question Bank', path: '/dashboard/exam-questions', requiredModule: 'CBT' },
  bulkUpload: { icon: 'UploadCloud', label: 'Bulk Upload', path: '/dashboard/upload/scores', requiredModule: 'SECONDARY_SCHOOL' },
  enterScores: { icon: 'Edit3', label: 'Enter Scores', path: '/dashboard/scores/enter', requiredModule: 'SECONDARY_SCHOOL' },
  reviewScores: { icon: 'CheckSquare', label: 'Review Scores', path: '/dashboard/scores', requiredModule: 'SECONDARY_SCHOOL' },
  tahfeezScores: { icon: 'BookText', label: 'Tahfeez Scores', path: '/dashboard/tahfeez', requiredModule: 'SECONDARY_SCHOOL' },
  midtermScores: { icon: 'ClipboardCheck', label: 'Mid-Term Results', path: '/dashboard/midterm', requiredModule: 'SECONDARY_SCHOOL' },
  behaviouralAssessment: { icon: 'Heart', label: 'Behavioural Assessment', path: '/dashboard/behavioural', requiredModule: 'SECONDARY_SCHOOL' },
  myStudents: { icon: 'UsersRound', label: 'My Students', path: '/dashboard/performance' },
  attendance: { icon: 'CalendarCheck', label: 'Student Attendance', path: '/dashboard/attendance' },
  staffAttendance: { icon: 'Fingerprint', label: 'Staff Clock-In', path: '/dashboard/bas/attendance' },
  reviewQuestions: { icon: 'FileQuestion', label: 'Review Questions', path: '/dashboard/exam-questions', requiredModule: 'CBT' },
  generateResults: { icon: 'CheckSquare', label: 'Generate Results', path: '/dashboard/results/generate', requiredModule: 'SECONDARY_SCHOOL' },
  viewResults: { icon: 'Award', label: 'View Results', path: '/dashboard/results/view', requiredModule: 'SECONDARY_SCHOOL' },
  timetable: { icon: 'Calendar', label: 'Timetable', path: '/dashboard/timetable' },
  examRegistration: { icon: 'Ticket', label: 'Exam Registration', path: '/dashboard/exam-registration', requiredModule: 'CBT' },
  seatingPlans: { icon: 'Grid', label: 'Seating Plans', path: '/dashboard/seating-plan', requiredModule: 'CBT' },
  feeSystem: { icon: 'Wallet', label: 'System Fee Structure', path: '/dashboard/finance/fee-structures', requiredModule: 'FINANCE' },
  invoices: { icon: 'FileText', label: 'Invoices', path: '/dashboard/finance/invoices', requiredModule: 'FINANCE' },
  payments: { icon: 'CreditCard', label: 'Payments', path: '/dashboard/finance/payments', requiredModule: 'FINANCE' },
  expenses: { icon: 'Wallet', label: 'Expenses', path: '/dashboard/finance/expenses', requiredModule: 'FINANCE' },
  payroll: { icon: 'Briefcase', label: 'Payroll', path: '/dashboard/finance/payroll', requiredModule: 'FINANCE' },
  reconciliation: { icon: 'Landmark', label: 'Reconciliation', path: '/dashboard/finance/ledger', requiredModule: 'FINANCE' },
  vouchers: { icon: 'Receipt', label: 'Payment Vouchers', path: '/dashboard/finance/vouchers', requiredModule: 'FINANCE' },
  chartOfAccounts: { icon: 'BookMarked', label: 'Chart of Accounts', path: '/dashboard/finance/chart-of-accounts', requiredModule: 'FINANCE' },
  financialReports: { icon: 'BarChart2', label: 'Financial Reports', path: '/dashboard/finance/reports', requiredModule: 'FINANCE' },

  // Parent Portal Links
  parentResults: { icon: 'GraduationCap', label: 'Report Cards', path: '/dashboard/parent/results' },
  parentAttendance: { icon: 'CalendarCheck', label: 'Attendance Log', path: '/dashboard/parent/attendance' },
  parentTimetable: { icon: 'Calendar', label: 'Class Timetable', path: '/dashboard/parent/timetable' },
  parentWallet: { icon: 'Wallet', label: 'Tuition Wallet', path: '/dashboard/parent/wallet', requiredModule: 'FINANCE' },
  parentInvoices: { icon: 'Receipt', label: 'Fee Invoices', path: '/dashboard/parent/invoices', requiredModule: 'FINANCE' },
  parentPayments: { icon: 'CreditCard', label: 'Pay School Fees', path: '/dashboard/parent/invoices', requiredModule: 'FINANCE' },
  parentAnnouncements: { icon: 'Megaphone', label: 'Announcements', path: '/dashboard/announcements' },
  
  studentResults: { icon: 'Award', label: 'My Results', path: '/dashboard/performance' },
  studentAssignments: { icon: 'FileEdit', label: 'Assignments', path: '/student/lms/assignments', requiredModule: 'LMS' },
  studentQuizzes: { icon: 'HelpCircle', label: 'Quizzes', path: '/student/lms/quizzes', requiredModule: 'CBT' },
  classesAndSubjects: { icon: 'BookMarked', label: 'Classes & Subjects', path: '/dashboard/system/classes-subjects', requiredModule: 'SECONDARY_SCHOOL' },
  gradingSystem: { icon: 'GraduationCap', label: 'Grading System', path: '/dashboard/system/grading', requiredModule: 'SECONDARY_SCHOOL' },
  aiSettings: { icon: 'Sparkles', label: 'AI Settings', path: '/dashboard/system/ai-settings' },
  idCards: { icon: 'CreditCard', label: 'ID Card Studio (PVC)', path: '/dashboard/system/id-cards' },

  // --- TERTIARY INSTITUTION MANAGEMENT SYSTEM (TIMS) ---
  tertiaryPrograms: { icon: 'GraduationCap', label: 'Degree Programs', path: '/dashboard/tertiary/programs', requiredModule: 'TERTIARY_INSTITUTION' },
  tertiaryCourses: { icon: 'BookMarked', label: 'Course Catalog', path: '/dashboard/tertiary/courses', requiredModule: 'TERTIARY_INSTITUTION' },
  tertiaryOfferings: { icon: 'Calendar', label: 'Course Offerings', path: '/dashboard/tertiary/offerings', requiredModule: 'TERTIARY_INSTITUTION' },
  tertiaryRegistration: { icon: 'Ticket', label: 'Course Registration', path: '/dashboard/tertiary/registration', requiredModule: 'TERTIARY_INSTITUTION' },
  tertiaryExams: { icon: 'Award', label: 'Anonymous Exam Grading', path: '/dashboard/tertiary/exams', requiredModule: 'TERTIARY_INSTITUTION' },
  tertiarySenate: { icon: 'Landmark', label: 'Senate Broadsheet & CGPA', path: '/dashboard/tertiary/senate', requiredModule: 'TERTIARY_INSTITUTION' },
  tertiaryDocket: { icon: 'QrCode', label: 'Exam Docket (QR)', path: '/dashboard/tertiary/docket', requiredModule: 'TERTIARY_INSTITUTION' },
  tertiaryTranscript: { icon: 'FileSpreadsheet', label: 'Academic Transcript', path: '/dashboard/tertiary/transcript', requiredModule: 'TERTIARY_INSTITUTION' },
  tertiaryCbt: { icon: 'CheckSquare', label: 'CBT Examination Engine', path: '/dashboard/tertiary/cbt', requiredModule: 'TERTIARY_INSTITUTION' },
  tertiaryClearance: { icon: 'Award', label: 'Graduation Clearance', path: '/dashboard/tertiary/clearance', requiredModule: 'TERTIARY_INSTITUTION' },
  tertiaryCertificate: { icon: 'GraduationCap', label: 'Degree Diploma', path: '/dashboard/tertiary/certificate', requiredModule: 'TERTIARY_INSTITUTION' },
  tertiaryTimetable: { icon: 'Calendar', label: 'Lecture Timetable', path: '/dashboard/tertiary/timetable', requiredModule: 'TERTIARY_INSTITUTION' },
  tertiaryPayments: { icon: 'CreditCard', label: 'Tuition Payments', path: '/dashboard/tertiary/payments', requiredModule: 'TERTIARY_INSTITUTION' },
  tertiaryCampuses: { icon: 'Building', label: 'Campuses & Faculties', path: '/dashboard/tertiary/campuses', requiredModule: 'TERTIARY_INSTITUTION' },
  tertiaryAddDrop: { icon: 'ArrowLeftRight', label: 'Course Add / Drop', path: '/dashboard/tertiary/add-drop', requiredModule: 'TERTIARY_INSTITUTION' },
  tertiaryForecast: { icon: 'TrendingUp', label: 'CGPA Forecaster', path: '/dashboard/tertiary/forecast', requiredModule: 'TERTIARY_INSTITUTION' },
  tertiaryOfficialTranscript: { icon: 'Award', label: 'Official Transcript', path: '/dashboard/tertiary/transcript/official', requiredModule: 'TERTIARY_INSTITUTION' },
  tertiaryStudentHub: { icon: 'UserCheck', label: 'Student Portal & Activities', path: '/dashboard/tertiary/student-hub', requiredModule: 'TERTIARY_INSTITUTION' },
  tertiaryLecturerStudio: { icon: 'Presentation', label: 'Lecturer Teaching Studio', path: '/dashboard/tertiary/lecturer-studio', requiredModule: 'TERTIARY_INSTITUTION' },
  tertiaryAdmissions: { icon: 'GraduationCap', label: 'Admissions & Post-UTME', path: '/dashboard/admissions', requiredModule: 'TERTIARY_INSTITUTION' },

  // --- E-LIBRARY MODULE ---
  elibraryCatalog: { icon: 'BookOpen', label: 'e-Library Catalog', path: '/dashboard/elibrary', requiredModule: 'E_LIBRARY' },
  elibraryLoans: { icon: 'BookCopy', label: 'Borrowing & Loans', path: '/dashboard/elibrary/loans', requiredModule: 'E_LIBRARY' },
  bas: { icon: 'Fingerprint', label: 'Biometrics (BAS)', path: '/dashboard/bas/dashboard', requiredModule: 'BAS_BIOMETRICS',
    subLinks: [
      { label: 'Dashboard', path: '/dashboard/bas/dashboard' },
      { label: 'My Attendance', path: '/dashboard/bas/attendance' },
      { label: 'Enrolled Staff', path: '/dashboard/bas/staff' },
      { label: 'Shifts & Rules', path: '/dashboard/bas/shifts' },
      { label: 'Reports', path: '/dashboard/bas/reports' },
      { label: 'Kiosks', path: '/dashboard/bas/kiosks' },
      { label: 'Holidays', path: '/dashboard/bas/holidays' },
    ]
  },
  hostels: {
    icon: 'Building',
    label: 'Hostel & Bedspaces',
    path: '/dashboard/hostels',
    requiredModule: 'HOSTEL',
    subLinks: [
      { label: 'Hostels Directory', path: '/dashboard/hostels', requiredModule: 'HOSTEL' },
      { label: 'Bedspace Allocations', path: '/dashboard/hostels/allocations', requiredModule: 'HOSTEL' },
      { label: 'Bedspace Booking', path: '/dashboard/hostels/booking', requiredModule: 'HOSTEL' },
    ]
  },
  studentHostelBooking: {
    icon: 'Building',
    label: 'Hostel Accommodation',
    path: '/dashboard/hostels/booking',
    requiredModule: 'HOSTEL',
  },
};

export const navConfig: Record<string, { group: string; links: (keyof typeof allNavLinks)[] }[]> = {
  ADMIN: [
    { group: 'Main', links: ['dashboard', 'profile', 'notifications', 'announcements', 'messaging'] },
    { group: 'Management', links: ['reports', 'system', 'manageStaff', 'manageStudents', 'departments', 'idCards', 'hostels', 'bas'] },
    { group: 'Finance', links: ['feeSystem', 'invoices', 'payments', 'expenses', 'vouchers', 'payroll', 'reconciliation', 'chartOfAccounts', 'financialReports'] },
    { group: 'Academics', links: ['attendance', 'lessonApprovals', 'reviewQuestions', 'enterScores', 'reviewScores', 'tahfeezScores', 'midtermScores', 'behaviouralAssessment', 'generateResults', 'viewResults'] },
    { group: 'Tertiary (TIMS)', links: ['tertiaryAdmissions', 'tertiaryStudentHub', 'tertiaryLecturerStudio', 'tertiaryCampuses', 'tertiaryPrograms', 'tertiaryCourses', 'tertiaryOfferings', 'tertiaryTimetable', 'tertiaryRegistration', 'tertiaryAddDrop', 'tertiaryPayments', 'tertiaryCbt', 'tertiaryExams', 'tertiarySenate', 'tertiaryDocket', 'tertiaryTranscript', 'tertiaryOfficialTranscript', 'tertiaryForecast', 'tertiaryClearance', 'tertiaryCertificate'] },
    { group: 'e-Library', links: ['elibraryCatalog', 'elibraryLoans'] },
    { group: 'Infrastructure', links: ['database', 'logs'] }
  ],
  SLT: [
    { group: 'Main', links: ['dashboard', 'profile', 'notifications', 'announcements'] },
    { group: 'Communication', links: ['messaging'] },
    { group: 'Oversight', links: ['reports', 'manageStaff', 'manageStudents', 'hostels'] },
    { group: 'Academics', links: ['academicOverview', 'lessonApprovals', 'generateResults', 'viewResults', 'gradingSystem', 'classesAndSubjects', 'aiSettings'] },
    { group: 'Tertiary (TIMS)', links: ['tertiaryAdmissions', 'tertiaryStudentHub', 'tertiaryLecturerStudio', 'tertiaryCampuses', 'tertiaryPrograms', 'tertiaryCourses', 'tertiaryOfferings', 'tertiaryTimetable', 'tertiaryRegistration', 'tertiaryAddDrop', 'tertiaryPayments', 'tertiaryCbt', 'tertiaryExams', 'tertiarySenate', 'tertiaryDocket', 'tertiaryTranscript', 'tertiaryOfficialTranscript', 'tertiaryForecast', 'tertiaryClearance', 'tertiaryCertificate'] },
    { group: 'e-Library', links: ['elibraryCatalog', 'elibraryLoans'] },
    { group: 'Finance', links: ['financialReports'] },
  ],
  HOD: [
    { group: 'Main', links: ['dashboard', 'profile', 'notifications', 'announcements'] },
    { group: 'Communication', links: ['messaging'] },
    { group: 'Department', links: ['attendance', 'lessonApprovals', 'enterScores', 'reviewScores', 'tahfeezScores', 'midtermScores', 'behaviouralAssessment', 'hodAnalytics', 'manageStaff'] },
    { group: 'Academics', links: ['classesAndSubjects'] },
    { group: 'Tertiary Academics', links: ['tertiaryLecturerStudio', 'tertiaryCourses', 'tertiaryOfferings', 'tertiaryTimetable', 'tertiaryRegistration', 'tertiaryCbt', 'tertiaryExams', 'tertiarySenate', 'tertiaryDocket', 'tertiaryTranscript', 'tertiaryClearance'] },
    { group: 'e-Library', links: ['elibraryCatalog'] },
  ],
  ACCOUNTANT: [
    { group: 'Main', links: ['dashboard', 'profile', 'notifications', 'announcements'] },
    { group: 'Communication', links: ['messaging'] },
    { group: 'Finance', links: ['feeSystem', 'invoices', 'payments', 'expenses', 'vouchers', 'payroll', 'reconciliation', 'chartOfAccounts', 'financialReports'] },
  ],
  EXAM_OFFICER: [
    { group: 'Main', links: ['dashboard', 'profile', 'notifications', 'announcements'] },
    { group: 'Communication', links: ['messaging'] },
    { group: 'Examinations', links: ['reviewQuestions', 'reviewScores', 'tahfeezScores', 'midtermScores', 'behaviouralAssessment', 'generateResults', 'viewResults', 'timetable', 'examRegistration', 'seatingPlans'] },
    { group: 'Tertiary Examinations', links: ['tertiaryOfferings', 'tertiaryTimetable', 'tertiaryRegistration', 'tertiaryCbt', 'tertiaryExams', 'tertiarySenate', 'tertiaryDocket', 'tertiaryTranscript', 'tertiaryCertificate'] },
  ],
  LECTURER: [
    { group: 'Main', links: ['dashboard', 'profile', 'notifications', 'announcements'] },
    { group: 'Communication', links: ['messaging'] },
    { group: 'Tertiary Academics', links: ['tertiaryLecturerStudio', 'tertiaryOfferings', 'tertiaryCourses', 'tertiaryTimetable', 'tertiaryCbt', 'tertiaryExams', 'tertiarySenate', 'staffAttendance'] },
    { group: 'e-Library', links: ['elibraryCatalog'] },
  ],
  TEACHER: [
    { group: 'Main', links: ['dashboard', 'profile', 'notifications', 'announcements'] },
    { group: 'Communication', links: ['messaging'] },
    { group: 'My Work', links: ['lessonPlans', 'examQuestions', 'bulkUpload', 'enterScores', 'reviewScores', 'tahfeezScores', 'midtermScores', 'behaviouralAssessment', 'attendance', 'myStudents', 'timetable', 'staffAttendance'] },
    { group: 'e-Library', links: ['elibraryCatalog'] },
  ],
  PARENT: [
    { group: 'Main', links: ['dashboard', 'profile', 'notifications', 'parentAnnouncements'] },
    { group: 'My Wards', links: ['parentResults', 'parentAttendance', 'parentTimetable'] },
    { group: 'Tuition & Wallet', links: ['parentWallet', 'parentInvoices'] },
  ],
  STUDENT: [
    { group: 'Main', links: ['dashboard', 'profile', 'notifications', 'messaging'] },
    { group: 'Academics', links: ['studentResults', 'studentAssignments', 'studentQuizzes', 'timetable'] },
    { group: 'Tertiary (TIMS)', links: ['tertiaryStudentHub', 'studentHostelBooking', 'tertiaryPayments', 'tertiaryTimetable', 'tertiaryRegistration', 'tertiaryAddDrop', 'tertiaryForecast', 'tertiaryCbt', 'tertiaryDocket', 'tertiaryTranscript', 'tertiaryOfficialTranscript', 'tertiaryCertificate'] },
    { group: 'e-Library', links: ['elibraryCatalog'] },
  ],
};

const routePermissions: Record<string, string[]> = {};

// Populate routePermissions from navConfig
for (const role in navConfig) {
    navConfig[role].forEach(group => {
        group.links.forEach(linkKey => {
            const link = allNavLinks[linkKey];
            if (link) {
                if (!routePermissions[link.path]) {
                    routePermissions[link.path] = [];
                }
                if (!routePermissions[link.path].includes(role)) {
                    routePermissions[link.path].push(role);
                }
                // Also add sublinks
                if (link.subLinks) {
                    link.subLinks.forEach(sub => {
                        if (!routePermissions[sub.path]) {
                            routePermissions[sub.path] = [];
                        }
                        if (!routePermissions[sub.path].includes(role)) {
                            routePermissions[sub.path].push(role);
                        }
                    });
                }
            }
        });
    });
}

// Add common pages that don't appear in nav but should be accessible
const commonPages = [
    '/dashboard/settings',
    '/dashboard/admissions',
    '/dashboard/tertiary/admissions',
    '/dashboard/hr',
    '/dashboard/teacher/attendance',
    '/dashboard/timetable',
    '/dashboard/tertiary/timetable',
    '/dashboard/scores',
    '/dashboard/scores/enter',
    '/dashboard/hostels',
    '/dashboard/hostels/booking',
    '/dashboard/hostels/allocations',
    '/dashboard/parent/wallet',
    '/dashboard/parent/invoices',
    '/dashboard/parent/results',
    '/dashboard/parent/attendance',
    '/dashboard/parent/timetable',
];
commonPages.forEach(path => {
    routePermissions[path] = Object.keys(navConfig);
});

export const ROUTE_MODULE_MAP: { prefix: string; module: string; label: string }[] = [
  { prefix: '/dashboard/tertiary', module: 'TERTIARY_INSTITUTION', label: 'Tertiary Institution (TIMS)' },
  { prefix: '/dashboard/admissions', module: 'TERTIARY_INSTITUTION', label: 'Tertiary Admissions' },
  { prefix: '/dashboard/hostels', module: 'HOSTEL', label: 'Hostel & Bedspaces' },
  { prefix: '/dashboard/scores', module: 'SECONDARY_SCHOOL', label: 'Secondary School Scores' },
  { prefix: '/dashboard/tahfeez', module: 'SECONDARY_SCHOOL', label: 'Tahfeez Evaluation' },
  { prefix: '/dashboard/midterm', module: 'SECONDARY_SCHOOL', label: 'Secondary Mid-Term' },
  { prefix: '/dashboard/behavioural', module: 'SECONDARY_SCHOOL', label: 'Behavioural Assessment' },
  { prefix: '/dashboard/results', module: 'SECONDARY_SCHOOL', label: 'Secondary Results' },
  { prefix: '/dashboard/upload/scores', module: 'SECONDARY_SCHOOL', label: 'Score Uploads' },
  { prefix: '/dashboard/system/classes-subjects', module: 'SECONDARY_SCHOOL', label: 'Classes & Subjects' },
  { prefix: '/dashboard/system/grading', module: 'SECONDARY_SCHOOL', label: 'Grading Configuration' },
  { prefix: '/dashboard/finance', module: 'FINANCE', label: 'Finance & Bursary' },
  { prefix: '/dashboard/pay', module: 'FINANCE', label: 'Tuition Payments' },
  { prefix: '/dashboard/elibrary', module: 'E_LIBRARY', label: 'e-Library & Repository' },
  { prefix: '/dashboard/bas', module: 'BAS_BIOMETRICS', label: 'Biometric Attendance (BAS)' },
  { prefix: '/dashboard/exam-questions', module: 'CBT', label: 'Question Bank' },
  { prefix: '/dashboard/exam-registration', module: 'CBT', label: 'Exam Registration' },
  { prefix: '/dashboard/seating-plan', module: 'CBT', label: 'Seating Plans' },
  { prefix: '/student/lms', module: 'LMS', label: 'Learning Management System' },
  { prefix: '/dashboard/lesson-notes', module: 'LMS', label: 'Lesson Notes & Plans' },
];

export function isPathAuthorized(
    pathname: string, 
    role: string, 
    rbacPermissions?: string[], 
    activeModules?: string[]
): boolean {
    if (!role) {
        return false;
    }

    // Module Enforcement: If an institutional module is disabled, its specific pages are disabled
    // System module settings page (/dashboard/system/modules) is always permitted so admins can re-enable modules.
    if (activeModules && activeModules.length > 0 && pathname !== '/dashboard/system/modules') {
        const matchingModule = ROUTE_MODULE_MAP.find(m => pathname === m.prefix || pathname.startsWith(m.prefix + '/'));
        if (matchingModule && !activeModules.includes(matchingModule.module)) {
            return false;
        }
    }

    if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
        return true;
    }
    
    // Dynamic RBAC Permission Checks
    if (pathname.startsWith('/dashboard/system/roles') && rbacPermissions?.some(p => p.startsWith('manage:roles'))) {
        return true;
    }
    
    if (pathname.startsWith('/dashboard/bas') && rbacPermissions?.some(p => p.includes(':attendance') || p.includes(':kiosk'))) {
        return true;
    }

    if ((pathname.startsWith('/dashboard/users') || pathname.startsWith('/dashboard/staff')) && rbacPermissions?.some(p => p.includes(':staff'))) {
        return true;
    }

    if (pathname.startsWith('/dashboard/students') && rbacPermissions?.some(p => p.includes(':students'))) {
        return true;
    }

    if ((pathname.startsWith('/dashboard/system/classes-subjects') || pathname.startsWith('/dashboard/system/grading')) && rbacPermissions?.some(p => p.includes(':academics'))) {
        return true;
    }

    // Allow access to settings for all roles
    if (pathname === '/dashboard/settings') {
        return true;
    }

    // Exact match
    if (routePermissions[pathname]?.includes(role)) {
        return true;
    }
    
    // Dynamic route matching based on exact regex
    const dynamicRoute = Object.keys(routePermissions).find(route => {
        if (!route.includes('[')) return false;
        const routeRegex = new RegExp(`^${route.replace(/\[\.\.\.\w+\]/g, '.+').replace(/\[\w+\]/g, '[^/]+')}$`);
        return routeRegex.test(pathname);
    });

    if (dynamicRoute && routePermissions[dynamicRoute]?.includes(role)) {
        return true;
    }

    // Prefix-based fallback for sub-pages (e.g. /dashboard/announcements/123)
    const basePathMatch = Object.keys(routePermissions)
        .filter(route => route !== '/dashboard' && !route.includes('['))
        .sort((a, b) => b.length - a.length)
        .find(route => pathname.startsWith(route + '/'));

    if (basePathMatch && routePermissions[basePathMatch]?.includes(role)) {
        return true;
    }

    return false;
}

export function getFilteredNavConfig(role: string, activeModules: string[], institutionTier?: string) {
    const effectiveRole = role === 'SUPER_ADMIN' ? 'ADMIN' : role;
    if (!navConfig[effectiveRole]) return [];

    return navConfig[effectiveRole].map(group => {
        // If user is a Secondary School Student, hide the Tertiary (TIMS) group
        if (effectiveRole === 'STUDENT' && institutionTier === 'SECONDARY' && group.group === 'Tertiary (TIMS)') {
            return { ...group, links: [] };
        }
        // If user is a Tertiary Student, hide the K-12 Academics group
        if (effectiveRole === 'STUDENT' && institutionTier === 'TERTIARY' && group.group === 'Academics') {
            return { ...group, links: [] };
        }

        // Filter links in this group
        const filteredLinks = group.links.filter(linkKey => {
            const link = allNavLinks[linkKey];
            if (!link) return false;
            
            // If the link requires a specific module, check if the school has it
            if (link.requiredModule && !activeModules.includes(link.requiredModule)) {
                return false;
            }
            return true;
        });

        return {
            ...group,
            links: filteredLinks
        };
    }).filter(group => group.links.length > 0); // Remove empty groups
}
