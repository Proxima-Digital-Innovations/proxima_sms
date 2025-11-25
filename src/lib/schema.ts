

export type User = {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  passwordHash: string;
  role: 'admin' | 'hod' | 'teacher' | 'parent';
  profilePic?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Department = {
  id: string;
  _id: string;
  name: string;
  hodId: string; // ObjectId -> users._id
  createdAt: Date;
};

export type ClassData = {
  id:string;
  name: string;
  teacherId?: string; // Class teacher
  subjectIds?: string[];
  subjectTeachers?: { [subjectId: string]: string }; // Map subjectId to teacherId
};


export type Subject = {
  id: string;
  name: string;
};

export type LessonNote = {
  _id: string;
  title: string;
  subjectId: string; // ObjectId -> subjects._id
  teacherId: string; // ObjectId -> users._id
  fileUrl: string;
  content?: string; // Keeping content for existing functionality
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string; // ObjectId -> users._id (HOD/Admin)
  hod_review?: string | null;
  admin_review?: string | null;
  submissionDate: string; // From previous mock data
  createdAt: Date;
  updatedAt: Date;
};

export type AppNotification = {
  id: string;
  toUserId: string;
  type: 'APPROVAL' | 'REJECTION' | 'INFO';
  title: string;
  body: string;
  ref: {
    collection: string;
    id: string;
  };
  read: boolean;
  createdAt: { seconds: number; nanoseconds: number; };
};


export type Announcement = {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: { seconds: number, nanoseconds: number };
  updatedAt?: { seconds: number, nanoseconds: number };
};

// New, detailed Student Schema
export type Student = {
    id: string;
    studentId: string; // GIIA/STU/24/0001
    firstName: string;
    lastName: string;
    middleName?: string;
    gender: 'Male' | 'Female' | 'Other';
    dateOfBirth: any; // Firestore Timestamp
    classLevel: string;
    sessionYear: string;
    profilePicture?: string;
    creditBalance: number;
    guardians: Guardian[];
    contacts: EmergencyContact[];
    documents?: StudentDocument[];
    health: HealthInfo;
    status: 'Active' | 'Inactive' | 'Graduated';
    createdAt: any; // Firestore Timestamp
    admissionDate: any;
}

export type Guardian = {
    fullName: string;
    relationship: string;
    phone: string;
    email: string;
    address: string;
    occupation?: string;
    isPrimary: boolean; // To identify the main contact
    userId?: string; // Firestore UID for parent login
}

export type EmergencyContact = {
    emergencyContactName: string;
    emergencyContactPhone: string;
    relationToStudent: string;
}

export type StudentDocument = {
    documentType: string;
    fileUrl: string;
    storagePath: string;
}

export type HealthInfo = {
    bloodGroup?: string;
    genotype?: string;
    allergies?: string;
    medicalConditions?: string;
}

export type Score = {
  id: string;
  studentId: string;
  subject: string;
  class: string;
  teacherId: string;
  term: string;
  caScore: number;
  examScore: number;
  totalScore: number;
  status: 'Draft' | 'Pending' | 'Approved' | 'Rejected';
};

export type ReportCard = {
  id: string;
  studentId: string;
  studentName: string;
  class: string;
  term: string;
  session: string;
  generatedAt: any; // Firestore Timestamp
  subjects: {
    name: string;
    caScore: number;
    examScore: number;
    totalScore: number;
    grade: string;
  }[];
  totalMarks: number;
  average: number;
  overallGrade: string;
  classRank: number;
  principalComment?: string;
  teacherComment?: string;
};

export type FeeItem = {
    name: string;
    amount: number;
};

export type FeeStructure = {
    id: string;
    className: string;
    session: string;
    term: string;
    totalAmount: number;
    items: FeeItem[];
    createdAt: any; // Firestore timestamp
};

export type InvoiceItem = {
    name: string;
    amount: number;
};

export type Invoice = {
    id: string;
    invoiceId: string; // e.g., INV-2024-0001
    studentId: string;
    studentName: string;
    class: string;
    session: string;
    term: string;
    items: InvoiceItem[];
    totalAmount: number;
    amountPaid: number;
    balance: number;
    status: 'Paid' | 'Unpaid' | 'Overdue' | 'Partially Paid';
    createdAt: any; // Firestore timestamp
    dueDate: any; // Firestore timestamp
};

export type Payment = {
    id: string;
    invoiceId: string;
    studentId: string;
    studentName: string;
    amountPaid: number;
    paymentDate: any; // Firestore timestamp
    paymentMethod: 'Bank Transfer' | 'POS' | 'Cash';
    recordedBy: string; // UID of accountant
    recordedByName: string;
    notes?: string;
    createdAt: any; // Firestore timestamp
}

export type Expense = {
    id: string;
    category: 'Utilities' | 'Salaries' | 'Maintenance' | 'Supplies' | 'Marketing' | 'Capital Expenditure' | 'Miscellaneous';
    description: string;
    amount: number;
    date: any; // Firestore Timestamp
    recordedBy: string; // UID of accountant
    recordedByName: string;
    department?: string; // Optional
    createdAt: any; // Firestore Timestamp
}

export type PayrollRun = {
  id: string;
  month: string;
  year: number;
  executedBy: string; // UID of accountant
  executedByName: string;
  totalAmount: number;
  employeeCount: number;
  executedAt: any; // Firestore Timestamp
}

export type Payslip = {
  id: string;
  payrollRunId: string;
  staffId: string; // GIIA Staff ID
  employeeName: string;
  payPeriod: string; // e.g., "October 2025"
  amount: number;
  bankName: string;
  accountNumber: string;
  status: 'Generated' | 'Paid';
  generatedAt: any; // Firestore Timestamp
}

export type AttendanceRecord = {
    studentId: string;
    studentName: string;
    status: 'Present' | 'Absent' | 'Late';
};

export type AttendanceSheet = {
    id: string; // Format: CLASSNAME-YYYY-MM-DD
    date: any; // Firestore Timestamp
    className: string;
    records: AttendanceRecord[];
    lastUpdated: any; // Firestore Timestamp
};


export type MockUser = {
  id: string;
  uid: string;
  staffId: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string;
  stateOfOrigin: string;
  department: string;
  className?: string; // Optional for class teachers
  classLevel?: string;
  role: string;
  employmentDate: any; // Can be a Firestore Timestamp
  employmentType?: 'Full-Time' | 'Part-Time';
  salary?: {
    amount: number;
    bankName: string | null;
    accountNumber: string | null;
    accountName: string | null;
  };
  personalInfo?: {
    address: string;
    gender: string;
    dob: any; // Can be a Firestore Timestamp
    nextOfKin: string | null;
    profilePicture: string | null;
  };
  permissions?: {
    canUploadLessonNotes: boolean;
    canViewSalary: boolean;
    canAccessPortal: boolean;
  };
  status: string;
  createdAt: any; // Can be a Firestore Timestamp
  generatedPassword?: string;
};


export type MockLessonNote = {
    id: string;
    title: string;
    subject: string;
    class: string;
    teacherId: string;
    teacherName: string;
    status: string;
    submissionDate: string;
    fileUrl: string;
    storagePath: string;
    content: string; // this is legacy, should be removed later
    hod_review: string | null;
    admin_review: string | null;
    submittedOn?: any;
    type?: 'Lesson Plan' | 'Exam Question' | 'Test Question';
};

export type SchoolInfo = {
    name: string;
    address: string;
    phone: string;
    email: string;
    logoUrl?: string;
}

// --- New Types for Migration ---

export type InventoryItem = {
    id: string;
    name: string;
    category: string;
    description?: string;
    departmentId?: string;
    quantityInStock: number;
    reorderLevel: number;
    expiryDate?: any; // Firestore Timestamp
    createdAt: any;
};

export type Supplier = {
    id: string;
    name: string;
    contactEmail?: string;
    contactPhone?: string;
    address?: string;
};

export type PurchaseOrder = {
    id: string;
    itemId: string;
    itemName: string;
    quantityOrdered: number;
    receivedQuantity: number;
    pricePerUnit: number;
    orderDate: any;
    supplierId?: string;
    receivedDate?: any;
    totalCost: number;
    status: 'Pending' | 'Received' | 'Partial';
};

export type TahfeezScore = {
    id: string;
    studentId: string;
    studentName: string;
    surah?: string; // or subject 'Quran'
    juz?: number;
    page?: number;
    marks: number;
    session: string;
    term: string;
    class: string;
    createdAt: any;
};

export type MidTermResult = {
    id: string;
    studentId: string;
    studentName: string;
    subjectId: string;
    subjectName: string;
    class: string;
    session: string;
    term: string;
    score: number;
    achievement: string; // e.g., "Excellent", "Good", "Fair", "Poor"
    createdAt: any;
};

export type BehaviouralAssessment = {
    id: string;
    studentId: string;
    session: string;
    term: string;
    class: string;
    conduct: number;
    punctuality: number;
    dedication: number;
    participation: number;
    hospitality: number;
    neatness: number;
    creativity: number;
    physical: number;
    createdAt: any;
};
