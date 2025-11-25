

'use client';

import {
  Activity, BarChart2, Bell, Book, Building, Calendar, DollarSign, LayoutDashboard, LogOut, MessageSquare, Server, Settings, Shield, User, Users,
  UsersRound, FileQuestion, BookCopy, Edit3, CheckSquare, Award, BookOpen, TrendingUp, Landmark, Wallet, Briefcase, FileText, CreditCard,
  Receipt, Ticket, Grid, BookMarked, Wrench, GraduationCap, Sparkles, UploadCloud, CalendarCheck, Heart, ClipboardCheck, BookText,
} from 'lucide-react';
import type { ElementType } from 'react';

const iconMap: { [key: string]: ElementType } = {
  LayoutDashboard, User, Users, UsersRound, Building, Server, Activity, Book, FileText, BarChart2, BookOpen, Edit3, DollarSign, Calendar, Bell, MessageSquare,
  FileQuestion, BookCopy, CheckSquare, Award, Shield, Settings, LogOut, TrendingUp, Landmark, Wallet, Briefcase, Receipt, CreditCard, Ticket, Grid,
  BookMarked, Wrench, GraduationCap, Sparkles, UploadCloud, CalendarCheck, Heart, ClipboardCheck, BookText
};

export const allNavLinks: Record<string, { icon: string; label: string; path: string; subLinks?: { label: string; path: string }[] }> = {
  dashboard: { icon: 'LayoutDashboard', label: 'Dashboard', path: '/dashboard' },
  profile: { icon: 'User', label: 'Profile', path: '/profile' },
  notifications: { icon: 'Bell', label: 'Notifications', path: '/dashboard/notifications' },
  messaging: { icon: 'MessageSquare', label: 'Messaging', path: '/dashboard/messaging' },
  announcements: { icon: 'Bell', label: 'Announcements', path: '/dashboard/announcements' },
  reports: { icon: 'TrendingUp', label: 'Reports & Analytics', path: '/dashboard/reports' },
  system: { icon: 'Shield', label: 'System Config', path: '/dashboard/system',
    subLinks: [
      { label: 'School Info', path: '/dashboard/system/school-info' },
      { label: 'Grading', path: '/dashboard/system/grading' },
      { label: 'Academic Year', path: '/dashboard/system/academic-year' },
      { label: 'AI Settings', path: '/dashboard/system/ai-settings' },
      { label: 'Roles', path: '/dashboard/system/roles' },
      { label: 'Classes & Subjects', path: '/dashboard/system/classes-subjects' },
      { label: 'Maintenance', path: '/dashboard/system/maintenance' },
    ]
  },
  manageStaff: { icon: 'Users', label: 'Manage Staff', path: '/dashboard/users' },
  manageStudents: { icon: 'UsersRound', label: 'Manage Students', path: '/dashboard/students' },
  departments: { icon: 'Building', label: 'Departments', path: '/dashboard/departments' },
  database: { icon: 'Server', label: 'Database', path: '/dashboard/db' },
  logs: { icon: 'Activity', label: 'Logs & Security', path: '/dashboard/logs' },
  lessonApprovals: { icon: 'Book', label: 'Lesson Approvals', path: '/dashboard/lesson-notes' },
  hodAnalytics: { icon: 'BarChart2', label: 'Dept. Analytics', path: '/dashboard/hod/analytics' },
  lessonPlans: { icon: 'BookCopy', label: 'Lesson Plans', path: '/dashboard/lesson-notes' },
  examQuestions: { icon: 'FileQuestion', label: 'Question Bank', path: '/dashboard/exam-questions' },
  bulkUpload: { icon: 'UploadCloud', label: 'Bulk Upload', path: '/dashboard/teacher/bulk-upload' },
  enterScores: { icon: 'Edit3', label: 'Enter Scores', path: '/dashboard/scores' },
  tahfeezScores: { icon: 'BookText', label: 'Tahfeez Scores', path: '/dashboard/tahfeez' },
  midtermScores: { icon: 'ClipboardCheck', label: 'Mid-Term Results', path: '/dashboard/midterm' },
  behaviouralAssessment: { icon: 'Heart', label: 'Behavioural Assessment', path: '/dashboard/behavioural' },
  myStudents: { icon: 'UsersRound', label: 'My Students', path: '/dashboard/performance' },
  attendance: { icon: 'CalendarCheck', label: 'Take Attendance', path: '/dashboard/teacher/attendance' },
  reviewQuestions: { icon: 'FileQuestion', label: 'Review Questions', path: '/dashboard/exam-questions' },
  generateResults: { icon: 'CheckSquare', label: 'Generate Results', path: '/dashboard/results/generate' },
  viewResults: { icon: 'Award', label: 'View Results', path: '/dashboard/results/view' },
  timetable: { icon: 'Calendar', label: 'Timetable', path: '/dashboard/timetable' },
  examRegistration: { icon: 'Ticket', label: 'Exam Registration', path: '/dashboard/exam-registration' },
  seatingPlans: { icon: 'Grid', label: 'Seating Plans', path: '/dashboard/seating-plan' },
  feeSystem: { icon: 'DollarSign', label: 'System Fee Structure', path: '/dashboard/accountant/fees' },
  invoices: { icon: 'FileText', label: 'Invoices', path: '/dashboard/accountant/invoices' },
  payments: { icon: 'CreditCard', label: 'Payments', path: '/dashboard/accountant/payments' },
  expenses: { icon: 'Wallet', label: 'Expenses', path: '/dashboard/accountant/expenses' },
  payroll: { icon: 'Briefcase', label: 'Payroll', path: '/dashboard/accountant/payroll' },
  reconciliation: { icon: 'Landmark', label: 'Reconciliation', path: '/dashboard/accountant/reconciliation' },
  financialReports: { icon: 'BarChart2', label: 'Financial Reports', path: '/dashboard/accountant/reports' },
  parentResults: { icon: 'BookOpen', label: 'Results', path: '/dashboard/performance' },
  parentPayments: { icon: 'DollarSign', label: 'Payments', path: '/dashboard/pay' },
  parentAnnouncements: { icon: 'Bell', label: 'Announcements', path: '/dashboard/announcements' },
  classesAndSubjects: { icon: 'BookMarked', label: 'Classes & Subjects', path: '/dashboard/system/classes-subjects' },
  gradingSystem: { icon: 'GraduationCap', label: 'Grading System', path: '/dashboard/system/grading' },
  aiSettings: { icon: 'Sparkles', label: 'AI Settings', path: '/dashboard/system/ai-settings' },
};

export const navConfig: Record<string, { group: string; links: (keyof typeof allNavLinks)[] }[]> = {
  Admin: [
    { group: 'Main', links: ['dashboard', 'profile', 'notifications'] },
    { group: 'Communication', links: ['announcements', 'messaging'] },
    { group: 'Management', links: ['reports', 'system', 'manageStaff', 'manageStudents', 'departments'] },
    { group: 'Finance', links: ['feeSystem', 'invoices', 'payments', 'expenses', 'payroll', 'reconciliation', 'financialReports'] },
    { group: 'Academics', links: ['lessonApprovals', 'reviewQuestions', 'enterScores', 'tahfeezScores', 'midtermScores', 'behaviouralAssessment', 'generateResults', 'viewResults'] },
    { group: 'Infrastructure', links: ['database', 'logs'] }
  ],
  SLT: [
    { group: 'Main', links: ['dashboard', 'profile', 'notifications'] },
    { group: 'Communication', links: ['announcements', 'messaging'] },
    { group: 'Oversight', links: ['reports', 'manageStaff', 'manageStudents'] },
    { group: 'Academics', links: ['lessonApprovals', 'enterScores', 'tahfeezScores', 'midtermScores', 'behaviouralAssessment', 'generateResults', 'viewResults', 'gradingSystem', 'classesAndSubjects', 'aiSettings'] },
    { group: 'Finance', links: ['financialReports'] },
  ],
  HeadOfDepartment: [
    { group: 'Main', links: ['dashboard', 'profile', 'notifications'] },
    { group: 'Communication', links: ['announcements', 'messaging'] },
    { group: 'Department', links: ['lessonApprovals', 'enterScores', 'tahfeezScores', 'midtermScores', 'behaviouralAssessment', 'hodAnalytics', 'manageStaff'] },
    { group: 'Academics', links: ['classesAndSubjects'] },
  ],
  Accountant: [
    { group: 'Main', links: ['dashboard', 'profile', 'notifications'] },
    { group: 'Communication', links: ['announcements', 'messaging'] },
    { group: 'Finance', links: ['feeSystem', 'invoices', 'payments', 'expenses', 'payroll', 'reconciliation', 'financialReports'] },
  ],
  ExamOfficer: [
    { group: 'Main', links: ['dashboard', 'profile', 'notifications'] },
    { group: 'Communication', links: ['announcements', 'messaging'] },
    { group: 'Examinations', links: ['reviewQuestions', 'enterScores', 'tahfeezScores', 'midtermScores', 'behaviouralAssessment', 'generateResults', 'viewResults', 'timetable', 'examRegistration', 'seatingPlans'] },
  ],
  Teacher: [
    { group: 'Main', links: ['dashboard', 'profile', 'notifications'] },
    { group: 'Communication', links: ['announcements', 'messaging'] },
    { group: 'My Work', links: ['lessonPlans', 'examQuestions', 'bulkUpload', 'enterScores', 'tahfeezScores', 'midtermScores', 'behaviouralAssessment', 'attendance', 'myStudents'] },
  ],
  Parent: [
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

export function isPathAuthorized(pathname: string, role: string): boolean {
    if (!role) {
        return false;
    }

    if (role === 'Admin') {
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
    
    // Dynamic route matching
    const dynamicRoute = Object.keys(routePermissions).find(route => {
        if (!route.includes('[')) return false;
        const routeRegex = new RegExp(`^${route.replace(/\[\.\.\.\w+\]/g, '.+').replace(/\[\w+\]/g, '[^/]+')}$`);
        return routeRegex.test(pathname);
    });

    if (dynamicRoute && routePermissions[dynamicRoute]?.includes(role)) {
        return true;
    }

    return false;
}
