import { isPathAuthorized } from '../src/lib/auth-guard';
console.log('SLT /dashboard/announcements:', isPathAuthorized('/dashboard/announcements', 'SLT'));
console.log('SLT /dashboard/announcements/create:', isPathAuthorized('/dashboard/announcements/create', 'SLT'));
console.log('TEACHER /dashboard/lesson-notes/123:', isPathAuthorized('/dashboard/lesson-notes/123', 'TEACHER'));
