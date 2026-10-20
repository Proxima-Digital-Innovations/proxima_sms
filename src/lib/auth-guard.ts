'use client';

import {
  Activity, BarChart2, Bell, Book, Building, Calendar, Wallet, LayoutDashboard, LogOut, MessageSquare, Server, Settings, Shield, User, Users,
  UsersRound, FileQuestion, BookCopy, Edit3, CheckSquare, Award, BookOpen, TrendingUp, Landmark, Briefcase, FileText, CreditCard,
  Receipt, Ticket, Grid, BookMarked, Wrench, GraduationCap, Sparkles, UploadCloud, CalendarCheck, Heart, ClipboardCheck, BookText,
} from 'lucide-react';
import type { ElementType } from 'react';

export const iconMap: { [key: string]: ElementType } = {
  LayoutDashboard, User, Users, UsersRound, Building, Server, Activity, Book, FileText, BarChart2, BookOpen, Edit3, Wallet, Calendar, Bell, MessageSquare,
  FileQuestion, BookCopy, CheckSquare, Award, Shield, Settings, LogOut, TrendingUp, Landmark, Briefcase, Receipt, CreditCard, Ticket, Grid,
  BookMarked, Wrench, GraduationCap, Sparkles, UploadCloud, CalendarCheck, Heart, ClipboardCheck, BookText
};

export const allNavLinks: Record<string, { icon: string; label: string; path: string; requiredModule?: string; subLinks?: { label: string; path: string; requiredModule?: string }[] }> = {
  dashboard: { icon: 'LayoutDashboard', label: 'Dashboard', path: '/dashboard' },
  profile: { icon: 'User', label: 'Profile', path: '/dashboard/profile' },
  notifications: { icon: 'Bell', label: 'Notifications', path: '/dashboard/notifications' },
  messaging: { icon: 'MessageSquare', label: 'Messaging', path: '/dashboard/messaging' },
  announcements: { icon: 'Bell', label: 'Announcements', path: '/dashboard/announcements' },
  reports: { icon: 'TrendingUp', label: 'Reports & Analytics', path: '/dashboard/analytics' },
  system: { icon: 'Shield', label: 'System Config', path: '/dashboard/system',
    subLinks: [
      { label: 'School Info', path: '/dashboard/system/school-info' },
      { label: 'Grading', path: '/dashboard/system/grading' },
      { label: 'Academic Year', path: '/dashboard/system/academic-year' },
      { label: 'AI Settings', path: '/dashboard/system/ai-settings' },
      { label: 'Roles', path: '/dashboard/system/roles' },
      { label: 'Classes & Subjects', path: '/dashboard/system/classes-subjects' },
      { label: 'Subscription', path: '/dashboard/system/license' },
      { label: 'Maintenance', path: '/dashboard/system/maintenance' },
    ]
  },
  manageStaff: { icon: 'Users', label: 'Manage Staff', path: '/dashboard/users', requiredModule: 'HR' },
  manageStudents: { icon: 'UsersRound', label: 'Manage Students', path: '/dashboard/students' },
  departments: { icon: 'Building', label: 'Departments', path: '/dashboard/departments' },
  database: { icon: 'Server', label: 'Database', path: '/dashboard/db' },
  logs: { icon: 'Activity', label: 'Logs & Security', path: '/dashboard/logs' },
  lessonApprovals: { icon: 'Book', label: 'Lesson Approvals', path: '/dashboard/lesson-notes' },
  hodAnalytics: { icon: 'BarChart2', label: 'Dept. Analytics', path: '/dashboard/hod/analytics' },
  academicOverview: { icon: 'LineChart', label: 'Academic Oversight', path: '/dashboard/slt/academics' },
  lessonPlans: { icon: 'BookCopy', label: 'Lesson Plans', path: '/dashboard/lesson-notes' },
  examQuestions: { icon: 'FileQuestion', label: 'Question Bank', path: '/dashboard/exam-questions', requiredModule: 'CBT' },
  bulkUpload: { icon: 'UploadCloud', label: 'Bulk Upload', path: '/dashboard/upload/scores' },
  enterScores: { icon: 'Edit3', label: 'Enter Scores', path: '/dashboard/scores/enter' },
  reviewScores: { icon: 'CheckSquare', label: 'Review Scores', path: '/dashboard/scores' },
  tahfeezScores: { icon: 'BookText', label: 'Tahfeez Scores', path: '/dashboard/tahfeez' },
  midtermScores: { icon: 'ClipboardCheck', label: 'Mid-Term Results', path: '/dashboard/midterm' },
  behaviouralAssessment: { icon: 'Heart', label: 'Behavioural Assessment', path: '/dashboard/behavioural' },
  myStudents: { icon: 'UsersRound', label: 'My Students', path: '/dashboard/performance' },
  attendance: { icon: 'CalendarCheck', label: 'Take Attendance', path: '/dashboard/teacher/attendance' },
  reviewQuestions: { icon: 'FileQuestion', label: 'Review Questions', path: '/dashboard/exam-questions', requiredModule: 'CBT' },
  generateResults: { icon: 'CheckSquare', label: 'Generate Results', path: '/dashboard/results/generate' },
  viewResults: { icon: 'Award', label: 'View Results', path: '/dashboard/results/view' },
  timetable: { icon: 'Calendar', label: 'Timetable', path: '/dashboard/timetable' },
  examRegistration: { icon: 'Ticket', label: 'Exam Registration', path: '/dashboard/exam-registration', requiredModule: 'CBT' },
  seatingPlans: { icon: 'Grid', label: 'Seating Plans', path: '/dashboard/seating-plan', requiredModule: 'CBT' },
  feeSystem: { icon: 'Wallet', label: 'System Fee Structure', path: '/dashboard/finance/fee-structures', requiredModule: 'FINANCE' },
  invoices: { icon: 'FileText', label: 'Invoices', path: '/dashboard/finance/invoices', requiredModule: 'FINANCE' },
  payments: { icon: 'CreditCard', label: 'Payments', path: '/dashboard/finance/payments', requiredModule: 'FINANCE' },
  expenses: { icon: 'Wallet', label: 'Expenses', path: '/dashboard/finance/expenses', requiredModule: 'FINANCE' },
  payroll: { icon: 'Briefcase', label: 'Payroll', path: '/dashboard/finance/payroll', requiredModule: 'FINANCE' },
  reconciliation: { icon: 'Landmark', label: 'Reconciliation', path: '/dashboard/finance/ledger', requiredModule: 'FINANCE' },
  chartOfAccounts: { icon: 'BookMarked', label: 'Chart of Accounts', path: '/dashboard/finance/chart-of-accounts', requiredModule: 'FINANCE' },
  financialReports: { icon: 'BarChart2', label: 'Financial Reports', path: '/dashboard/finance/reports', requiredModule: 'FINANCE' },
  parentResults: { icon: 'BookOpen', label: 'Results', path: '/dashboard/performance' },
  parentPayments: { icon: 'Wallet', label: 'Payments', path: '/dashboard/pay', requiredModule: 'FINANCE' },
  parentAnnouncements: { icon: 'Bell', label: 'Announcements', path: '/dashboard/announcements' },
  studentResults: { icon: 'Award', label: 'My Results', path: '/dashboard/performance' },
  studentAssignments: { icon: 'FileEdit', label: 'Assignments', path: '/student/lms/assignments', requiredModule: 'LMS' },
  studentQuizzes: { icon: 'HelpCircle', label: 'Quizzes', path: '/student/lms/quizzes', requiredModule: 'CBT' },
  classesAndSubjects: { icon: 'BookMarked', label: 'Classes & Subjects', path: '/dashboard/system/classes-subjects' },
  gradingSystem: { icon: 'GraduationCap', label: 'Grading System', path: '/dashboard/system/grading' },
  aiSettings: { icon: 'Sparkles', label: 'AI Settings', path: '/dashboard/system/ai-settings' },
  bas: { icon: 'Fingerprint', label: 'Biometrics (BAS)', path: '/dashboard/bas/dashboard', requiredModule: 'HR',
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
};

export const navConfig: Record<string, { group: string; links: (keyof typeof allNavLinks)[] }[]> = {
  ADMIN: [
    { group: 'Main', links: ['dashboard', 'profile', 'notifications', 'messaging', 'announcements'] },
    { group: 'Management', links: ['reports', 'system', 'manageStaff', 'manageStudents', 'departments', 'bas'] },
    { group: 'Finance', links: ['feeSystem', 'invoices', 'payments', 'expenses', 'payroll', 'reconciliation', 'chartOfAccounts', 'financialReports'] },
    { group: 'Academics', links: ['lessonApprovals', 'reviewQuestions', 'enterScores', 'reviewScores', 'tahfeezScores', 'midtermScores', 'behaviouralAssessment', 'generateResults', 'viewResults'] },
    { group: 'Infrastructure', links: ['database', 'logs'] }
  ],
  SLT: [
    { group: 'Main', links: ['dashboard', 'profile', 'notifications'] },
    { group: 'Communication', links: ['announcements', 'messaging'] },
    { group: 'Oversight', links: ['reports', 'manageStaff', 'manageStudents'] },
    { group: 'Academics', links: ['academicOverview', 'lessonApprovals', 'generateResults', 'viewResults', 'gradingSystem', 'classesAndSubjects', 'aiSettings'] },
    { group: 'Finance', links: ['financialReports'] },
  ],
  HOD: [
    { group: 'Main', links: ['dashboard', 'profile', 'notifications'] },
    { group: 'Communication', links: ['announcements', 'messaging'] },
    { group: 'Department', links: ['lessonApprovals', 'enterScores', 'reviewScores', 'tahfeezScores', 'midtermScores', 'behaviouralAssessment', 'hodAnalytics', 'manageStaff'] },
    { group: 'Academics', links: ['classesAndSubjects'] },
  ],
  ACCOUNTANT: [
    { group: 'Main', links: ['dashboard', 'profile', 'notifications'] },
    { group: 'Communication', links: ['announcements', 'messaging'] },
    { group: 'Finance', links: ['feeSystem', 'invoices', 'payments', 'expenses', 'payroll', 'reconciliation', 'chartOfAccounts', 'financialReports'] },
  ],
  EXAM_OFFICER: [
    { group: 'Main', links: ['dashboard', 'profile', 'notifications'] },
    { group: 'Communication', links: ['announcements', 'messaging'] },
    { group: 'Examinations', links: ['reviewQuestions', 'reviewScores', 'tahfeezScores', 'midtermScores', 'behaviouralAssessment', 'generateResults', 'viewResults', 'timetable', 'examRegistration', 'seatingPlans'] },
  ],
  TEACHER: [
    { group: 'Main', links: ['dashboard', 'profile', 'notifications'] },
    { group: 'Communication', links: ['announcements', 'messaging'] },
    { group: 'My Work', links: ['lessonPlans', 'examQuestions', 'bulkUpload', 'enterScores', 'tahfeezScores', 'midtermScores', 'behaviouralAssessment', 'attendance', 'myStudents'] },
  ],
  PARENT: [
    { group: 'Main', links: ['dashboard', 'profile', 'notifications'] },
    { group: 'My Child', links: ['parentResults', 'parentPayments', 'parentAnnouncements', 'timetable', 'messaging'] },
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
];
commonPages.forEach(path => {
    routePermissions[path] = Object.keys(navConfig);
});

export function isPathAuthorized(pathname: string, role: string, rbacPermissions?: string[]): boolean {
    if (!role) {
        return false;
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
    // If the base path is authorized for the role, allow sub-paths.
    const basePathMatch = Object.keys(routePermissions).find(route => {
        // Only match base paths without params
        if (route.includes('[')) return false;
        // Check if pathname starts with the base path + '/'
        return pathname.startsWith(route + '/');
    });

    if (basePathMatch && routePermissions[basePathMatch]?.includes(role)) {
        return true;
    }

    return false;
}

export function getFilteredNavConfig(role: string, activeModules: string[]) {
    const effectiveRole = role === 'SUPER_ADMIN' ? 'ADMIN' : role;
    if (!navConfig[effectiveRole]) return [];

    return navConfig[effectiveRole].map(group => {
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
