'use server';

import crypto from 'crypto';
import QRCode from 'qrcode';
import { prisma } from '@/lib/prisma';

export interface IdCardPerson {
  id: string;
  type: 'STUDENT' | 'STAFF' | 'VISITOR';
  fullName: string;
  code: string; // Matric number or staff code
  titleOrClass: string; // "B.Sc. Computer Science" or "Senior Lecturer"
  department: string;
  facultyOrSchool: string;
  currentLevel?: string;
  avatarUrl?: string | null;
  bloodGroup?: string;
  phone?: string;
  emergencyContact?: string;
  issueDate: string;
  expiryDate: string;
  nationalId?: string;
  status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';
}

// Generate secure verification token and QR code URL
export async function generateIdCardQr(code: string, type: string, fullName: string) {
  try {
    const secret = process.env.NEXTAUTH_SECRET || 'proxima-secure-id-card-secret-2026';
    const timestamp = new Date().toISOString().slice(0, 10);
    const hash = crypto.createHmac('sha256', secret).update(`${code}:${type}:${timestamp}`).digest('hex').slice(0, 16);
    
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const verifyUrl = `${baseUrl}/verify/id-card?code=${encodeURIComponent(code)}&type=${type}&token=${hash}`;
    
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 280,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });

    return { success: true, qrDataUrl, verifyUrl, hash };
  } catch (err: any) {
    console.error('Error generating ID card QR:', err);
    return { success: false, error: err.message };
  }
}

// Fetch all eligible candidates (Students & Staff) for ID card generation
export async function getIdCardDirectoryData() {
  try {
    // 1. Fetch Tertiary Students
    const tertiaryStudents = await prisma.studentProfile.findMany({
      include: {
        user: true,
        program: { include: { faculty: true, department: true } }
      },
      take: 25,
      orderBy: { createdAt: 'desc' }
    });

    // 2. Fetch Regular Students (if any exist)
    const k12Students = await prisma.student.findMany({
      include: { class: true },
      take: 25,
      orderBy: { createdAt: 'desc' }
    });

    // 3. Fetch Tertiary Staff Profiles
    const tertiaryStaff = await prisma.staffProfile.findMany({
      include: {
        user: true,
        department: true
      },
      take: 25,
      orderBy: { createdAt: 'desc' }
    });

    // 4. Fetch Users with Staff Roles
    const systemStaff = await prisma.user.findMany({
      where: {
        role: { in: ['TEACHER', 'ADMIN', 'SLT', 'HOD', 'ACCOUNTANT', 'EXAM_OFFICER'] }
      },
      include: { department: true },
      take: 25,
      orderBy: { createdAt: 'desc' }
    });

    // Format unified candidate list
    const candidates: IdCardPerson[] = [];

    // Tertiary Students
    tertiaryStudents.forEach(s => {
      const issueYear = new Date().getFullYear();
      candidates.push({
        id: s.id,
        type: 'STUDENT',
        fullName: `${s.user.firstName || ''} ${s.user.lastName || ''}`.trim() || s.matricNumber,
        code: s.matricNumber,
        titleOrClass: s.program?.name || 'Undergraduate Degree',
        department: s.program?.department?.name || 'Computer Science',
        facultyOrSchool: s.program?.faculty?.name || 'Faculty of Computing',
        currentLevel: `${s.currentLevel} Level`,
        avatarUrl: s.user.avatarUrl || null,
        bloodGroup: 'O+',
        phone: s.user.phone || '+234 800 000 0001',
        emergencyContact: '+234 800 000 9999',
        issueDate: `${issueYear}/09/01`,
        expiryDate: `${issueYear + 4}/08/31`,
        status: 'ACTIVE'
      });
    });

    // K12 Students
    k12Students.forEach(s => {
      const issueYear = new Date().getFullYear();
      candidates.push({
        id: s.id,
        type: 'STUDENT',
        fullName: `${s.firstName} ${s.lastName}`,
        code: s.studentId,
        titleOrClass: s.class?.name || 'Senior Class',
        department: 'Academics',
        facultyOrSchool: 'Secondary College',
        currentLevel: s.class?.name || 'Secondary',
        avatarUrl: null,
        bloodGroup: 'B+',
        phone: '+234 800 111 2222',
        emergencyContact: '+234 800 333 4444',
        issueDate: `${issueYear}/09/01`,
        expiryDate: `${issueYear + 1}/08/31`,
        status: s.status === 'Active' ? 'ACTIVE' : 'SUSPENDED'
      });
    });

    // Tertiary Staff
    tertiaryStaff.forEach(st => {
      const issueYear = new Date().getFullYear();
      candidates.push({
        id: st.id,
        type: 'STAFF',
        fullName: `${st.user.firstName || ''} ${st.user.lastName || ''}`.trim() || st.staffCode,
        code: st.staffCode,
        titleOrClass: st.user.role === 'TEACHER' ? 'Senior Lecturer / Academic Staff' : 'Senior Administrator',
        department: st.department?.name || 'Faculty of Computing',
        facultyOrSchool: 'Academic Affairs Directorate',
        avatarUrl: st.user.avatarUrl || null,
        bloodGroup: 'A+',
        phone: st.user.phone || '+234 802 345 6789',
        emergencyContact: '+234 803 987 6543',
        issueDate: `${issueYear}/01/15`,
        expiryDate: `${issueYear + 3}/12/31`,
        status: 'ACTIVE'
      });
    });

    // System Staff
    systemStaff.forEach(u => {
      if (!candidates.some(c => c.code === (u.staffId || u.username))) {
        const issueYear = new Date().getFullYear();
        candidates.push({
          id: u.id,
          type: 'STAFF',
          fullName: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username,
          code: u.staffId || `STF/${u.id.slice(-6).toUpperCase()}`,
          titleOrClass: `${u.role.replace(/_/g, ' ')} Officer`,
          department: u.department?.name || 'Administrative Headquarters',
          facultyOrSchool: 'Central Administration',
          avatarUrl: u.avatarUrl || null,
          bloodGroup: 'O+',
          phone: u.phone || '+234 805 123 4567',
          emergencyContact: '+234 805 765 4321',
          issueDate: `${issueYear}/01/15`,
          expiryDate: `${issueYear + 3}/12/31`,
          status: 'ACTIVE'
        });
      }
    });

    // Add a default sample visitor
    candidates.push({
      id: 'vis-sample-01',
      type: 'VISITOR',
      fullName: 'Chief Engr. Ibrahim Gambo',
      code: 'VIS/2026/048',
      titleOrClass: 'Visiting Accreditation Inspector (NUC / NBTE)',
      department: 'Quality Assurance Directorate',
      facultyOrSchool: 'National Universities Commission',
      avatarUrl: null,
      bloodGroup: 'AB+',
      phone: '+234 809 999 8888',
      emergencyContact: '+234 809 111 2222',
      issueDate: new Date().toISOString().slice(0, 10),
      expiryDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      status: 'ACTIVE'
    });

    return { success: true, candidates };
  } catch (error: any) {
    console.error('Error fetching ID card candidates:', error);
    return { success: false, error: error.message };
  }
}

// Public verification for QR code scans
export async function verifyIdCardAction(code: string, type: string) {
  try {
    const cleanCode = decodeURIComponent(code).trim();

    // 1. Search tertiary student
    const tertiaryStudent = await prisma.studentProfile.findFirst({
      where: { matricNumber: cleanCode },
      include: {
        user: true,
        program: { include: { faculty: true, department: true } },
        academicStandings: { take: 1, orderBy: { createdAt: 'desc' } }
      }
    });

    if (tertiaryStudent) {
      return {
        success: true,
        isValid: true,
        data: {
          fullName: `${tertiaryStudent.user.firstName || ''} ${tertiaryStudent.user.lastName || ''}`.trim(),
          code: tertiaryStudent.matricNumber,
          type: 'STUDENT',
          institution: 'PROXIMA TERTIARY INSTITUTE OF TECHNOLOGY',
          program: tertiaryStudent.program.name,
          faculty: tertiaryStudent.program.faculty?.name || 'Computing & Engineering',
          department: tertiaryStudent.program.department?.name || 'Computer Science',
          level: `${tertiaryStudent.currentLevel} Level`,
          status: 'ACTIVE VALID CREDENTIAL',
          verifiedAt: new Date().toISOString()
        }
      };
    }

    // 2. Search secondary student
    const k12Student = await prisma.student.findFirst({
      where: { studentId: cleanCode },
      include: { class: true }
    });

    if (k12Student) {
      return {
        success: true,
        isValid: true,
        data: {
          fullName: `${k12Student.firstName} ${k12Student.lastName}`,
          code: k12Student.studentId,
          type: 'STUDENT',
          institution: 'PROXIMA METROPOLITAN ACADEMY',
          program: k12Student.class?.name || 'Senior High',
          faculty: 'Secondary Division',
          department: 'Academics',
          level: k12Student.class?.name || 'Senior Secondary',
          status: k12Student.status.toUpperCase() === 'ACTIVE' ? 'ACTIVE VALID CREDENTIAL' : 'SUSPENDED',
          verifiedAt: new Date().toISOString()
        }
      };
    }

    // 3. Search staff
    const staffProfile = await prisma.staffProfile.findFirst({
      where: { staffCode: cleanCode },
      include: { user: true, department: true }
    });

    if (staffProfile) {
      return {
        success: true,
        isValid: true,
        data: {
          fullName: `${staffProfile.user.firstName || ''} ${staffProfile.user.lastName || ''}`.trim(),
          code: staffProfile.staffCode,
          type: 'STAFF',
          institution: 'PROXIMA TERTIARY INSTITUTE OF TECHNOLOGY',
          program: 'Academic / Teaching Faculty Member',
          faculty: 'Faculty Directorate',
          department: staffProfile.department?.name || 'Computer Science',
          level: staffProfile.user.role,
          status: 'OFFICIAL CERTIFIED FACULTY CREDENTIAL',
          verifiedAt: new Date().toISOString()
        }
      };
    }

    // 4. Search user by staffId
    const user = await prisma.user.findFirst({
      where: { staffId: cleanCode },
      include: { department: true }
    });

    if (user) {
      return {
        success: true,
        isValid: true,
        data: {
          fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          code: user.staffId || cleanCode,
          type: 'STAFF',
          institution: 'PROXIMA METROPOLITAN EDUCATIONAL SYSTEM',
          program: `${user.role.replace(/_/g, ' ')} Officer`,
          faculty: 'Central Administration',
          department: user.department?.name || 'Institutional Operations',
          level: user.role,
          status: 'OFFICIAL CERTIFIED FACULTY CREDENTIAL',
          verifiedAt: new Date().toISOString()
        }
      };
    }

    return {
      success: false,
      isValid: false,
      error: `No registered student or staff credential found for ID code: ${cleanCode}`
    };
  } catch (error: any) {
    console.error('Error verifying ID card:', error);
    return { success: false, isValid: false, error: error.message };
  }
}
