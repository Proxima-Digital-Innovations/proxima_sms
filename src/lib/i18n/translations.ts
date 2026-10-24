export type Language = 'en' | 'ar';

export interface TranslationDictionary {
  // Brand & Shell
  schoolPortal: string;
  educationPortal: string;
  poweredBy: string;
  proximaDigital: string;
  mainNavigation: string;
  searchPlaceholder: string;
  
  // Auth & Profile
  accountSettings: string;
  signOut: string;
  profile: string;
  language: string;
  languagePreference: string;
  languageSubtitle: string;
  english: string;
  englishDesc: string;
  arabic: string;
  arabicDesc: string;
  saveChanges: string;
  savedSuccessfully: string;
  appearance: string;
  appearanceSubtitle: string;
  lightMode: string;
  darkMode: string;
  systemMode: string;
  personalInfo: string;
  personalInfoSubtitle: string;
  fullName: string;
  emailAddress: string;
  assignedRole: string;
  staffNumber: string;
  accountStatus: string;
  activeAccount: string;
  viewStaffProfile: string;
  security: string;
  securitySubtitle: string;
  biometricBasPin: string;
  changePassword: string;
  
  // Dashboard & Common
  dashboard: string;
  overview: string;
  totalStudents: string;
  activeStudents: string;
  licensedCapacity: string;
  status: string;
  actions: string;
  filter: string;
  print: string;
  exportCsv: string;
  submit: string;
  cancel: string;
  edit: string;
  delete: string;
  view: string;
  loading: string;
  noDataFound: string;
  
  // Academics Group
  academics: string;
  enterScores: string;
  gradebook: string;
  reviewScores: string;
  midtermResults: string;
  tahfeezTracker: string;
  resultsBroadsheet: string;
  generateResults: string;
  viewResults: string;
  lessonPlans: string;
  examQuestions: string;
  
  // Students Group
  students: string;
  studentDirectory: string;
  studentAdmissions: string;
  studentPromotions: string;
  
  // Finance Group
  finance: string;
  invoices: string;
  payments: string;
  feeStructures: string;
  payroll: string;
  generalLedger: string;
  chartOfAccounts: string;
  financialReports: string;
  
  // Attendance & BAS Group
  attendance: string;
  staffAttendance: string;
  dailyAttendance: string;
  kiosks: string;
  shifts: string;
  holidays: string;
  
  // Operations & Enterprise
  recruitment: string;
  fleet: string;
  assets: string;
  inventory: string;
  timetable: string;
  seatingPlans: string;
  examRegistration: string;
  behaviouralAssessment: string;
  
  // Administration Group
  administration: string;
  academicYear: string;
  classesAndSubjects: string;
  staffManagement: string;
  rolesPermissions: string;
  schoolInfo: string;
  licenseCapacity: string;
  database: string;
  logsAndSecurity: string;
  notifications: string;
  messaging: string;
  announcements: string;
  reportsAndAnalytics: string;
  // Parent Portal & Hostels
  tuitionWallet: string;
  feeInvoices: string;
  attendanceLog: string;
  classTimetable: string;
  reportCards: string;
  hostels: string;
  bedspaceAllocations: string;
  hostelBooking: string;
  tuitionPayments: string;
  courseRegistration: string;
  senateApprovals: string;
  tertiaryStudentHub: string;

  // Extended ERP & Management
  staffLoans: string;
  expenses: string;
  inventoryOrders: string;
  inventorySuppliers: string;
  inventoryTransactions: string;
  aiSettings: string;
  feeSetup: string;
  gradingPolicy: string;
  systemMaintenance: string;
  communicationsSetup: string;
  uploadScores: string;
  uploadMidterm: string;
  resultTokens: string;
  printResults: string;
  printMidterm: string;
  classResults: string;
  sltDashboard: string;
  sltAcademics: string;
  hodDashboard: string;
  hodAnalytics: string;
}

export const translations: Record<Language, TranslationDictionary> = {
  en: {
    schoolPortal: 'Proxima SMS',
    educationPortal: 'Education Portal',
    poweredBy: 'Powered by',
    proximaDigital: 'Proxima Digital Innovations',
    mainNavigation: 'MAIN NAVIGATION',
    searchPlaceholder: 'Search anything (students, classes, subjects, invoices)...',
    
    accountSettings: 'Account Settings',
    signOut: 'Sign Out',
    profile: 'My Profile',
    language: 'Language',
    languagePreference: 'Language Preference',
    languageSubtitle: 'Select your preferred language for the system interface and reports',
    english: 'English',
    englishDesc: 'Left-to-right (LTR) standard layout',
    arabic: 'العربية (Arabic)',
    arabicDesc: 'Full Right-to-left (RTL) interface with Arabic numerals & typography',
    saveChanges: 'Save Changes',
    savedSuccessfully: 'Settings saved successfully',
    appearance: 'Appearance & Theme',
    appearanceSubtitle: 'Choose your visual preference for the portal interface',
    lightMode: 'Light Mode',
    darkMode: 'Dark Mode',
    systemMode: 'System Default',
    personalInfo: 'Personal Information',
    personalInfoSubtitle: 'Your verified identity details registered in the institution',
    fullName: 'Full Name',
    emailAddress: 'Email Address',
    assignedRole: 'Assigned Role',
    staffNumber: 'Staff / Identification ID',
    accountStatus: 'Account Status',
    activeAccount: 'Active & Verified',
    viewStaffProfile: 'View Full Staff Record',
    security: 'Security & Access',
    securitySubtitle: 'Authentication, kiosk clock-in, and access credentials',
    biometricBasPin: 'Kiosk Biometric Clock-in PIN',
    changePassword: 'Change Password',
    
    dashboard: 'Dashboard Overview',
    overview: 'Overview',
    totalStudents: 'Total Students',
    activeStudents: 'Active Students',
    licensedCapacity: 'Licensed Capacity',
    status: 'Status',
    actions: 'Actions',
    filter: 'Filter',
    print: 'Print',
    exportCsv: 'Export CSV',
    submit: 'Submit',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    view: 'View',
    loading: 'Loading...',
    noDataFound: 'No records found',
    
    academics: 'Academics & Scoring',
    enterScores: 'Enter CA & Exam Scores',
    gradebook: 'Advanced Gradebook',
    reviewScores: 'Score Moderation Deck',
    midtermResults: 'Mid-Term Assessment',
    tahfeezTracker: 'Tahfeez Quran Tracking',
    resultsBroadsheet: 'Master Broadsheet',
    generateResults: 'Process & Rank Results',
    viewResults: 'Student Report Cards',
    lessonPlans: 'Lesson Plans',
    examQuestions: 'Exam Question Papers',
    
    students: 'Students & Admissions',
    studentDirectory: 'Student Directory',
    studentAdmissions: 'Admit New Student',
    studentPromotions: 'Promote Cohort',
    
    finance: 'Finance & Bursary',
    invoices: 'Billing & Invoices',
    payments: 'Payment Receipts',
    feeStructures: 'Fee Structures',
    payroll: 'Staff Payroll',
    generalLedger: 'General Ledger',
    chartOfAccounts: 'Chart of Accounts',
    financialReports: 'Financial Statements',
    
    attendance: 'Attendance & Biometrics',
    staffAttendance: 'Staff Attendance (BAS)',
    dailyAttendance: 'Daily Log',
    kiosks: 'Biometric Kiosks',
    shifts: 'Work Shifts',
    holidays: 'School Holidays',

    recruitment: 'Staff Recruitment & ATS',
    fleet: 'Fleet & Transportation',
    assets: 'Fixed Assets Management',
    inventory: 'Inventory & Supplies',
    timetable: 'School Timetable',
    seatingPlans: 'Exam Seating Plans',
    examRegistration: 'Exam Candidate Numbers',
    behaviouralAssessment: 'Behavioural Assessment',
    
    administration: 'System & Administration',
    academicYear: 'Academic Session & Terms',
    classesAndSubjects: 'Classes & Subjects',
    staffManagement: 'Staff & Instructors',
    rolesPermissions: 'Roles & Access Control',
    schoolInfo: 'School Profile & Branding',
    licenseCapacity: 'Subscription & Student Limit',
    database: 'Database Engine & Health',
    logsAndSecurity: 'Audit Logs & Security',
    notifications: 'Notifications & Alerts',
    messaging: 'Internal Messaging',
    announcements: 'Announcements & Memos',
    reportsAndAnalytics: 'Reports & Analytics',
    tuitionWallet: 'School Tuition Wallet',
    feeInvoices: 'Fee Invoices',
    attendanceLog: 'Attendance Log',
    classTimetable: 'Class Timetable',
    reportCards: 'Report Cards',
    hostels: 'Hostels & Accommodation',
    bedspaceAllocations: 'Bedspace Allocations',
    hostelBooking: 'Hostel Booking',
    tuitionPayments: 'Tuition Payments',
    courseRegistration: 'Course Registration',
    senateApprovals: 'Senate Broadsheet & CGPA',
    tertiaryStudentHub: 'Student Portal & Activities',

    // Extended ERP & Management
    staffLoans: 'Staff Loans & Advances',
    expenses: 'Operating Expenses',
    inventoryOrders: 'Purchase Orders',
    inventorySuppliers: 'Suppliers Directory',
    inventoryTransactions: 'Stock Movements',
    aiSettings: 'AI Assistant & Automation',
    feeSetup: 'Fee Categories & Policies',
    gradingPolicy: 'Grading Scales & Policy',
    systemMaintenance: 'System Maintenance',
    communicationsSetup: 'Mail & SMS Gateway',
    uploadScores: 'Upload Scores Spreadsheet',
    uploadMidterm: 'Upload Mid-Term Scores',
    resultTokens: 'Result Scratch Cards & Tokens',
    printResults: 'Print Term Report Cards',
    printMidterm: 'Print Mid-Term Slips',
    classResults: 'Class Results Sheet',
    sltDashboard: 'Executive Leadership Console',
    sltAcademics: 'Academic Performance Monitor',
    hodDashboard: 'Department Overview',
    hodAnalytics: 'Department Analytics',
  },
  ar: {
    schoolPortal: 'بروكسيما لإدارة المدارس',
    educationPortal: 'البوابة التعليمية الذكية',
    poweredBy: 'مشغل بواسطة',
    proximaDigital: 'بروكسيما للابتكارات الرقمية',
    mainNavigation: 'القائمة الرئيسية',
    searchPlaceholder: 'بحث شامل (الطلاب، الفصول، المواد، الفواتير)...',
    
    accountSettings: 'إعدادات الحساب',
    signOut: 'تسجيل الخروج',
    profile: 'الملف الشخصي',
    language: 'اللغة',
    languagePreference: 'لغة العرض والواجهة',
    languageSubtitle: 'اختر لغتك المفضلة لتصفح النظام والتقارير والشهادات',
    english: 'English (الإنجليزية)',
    englishDesc: 'واجهة من اليسار إلى اليمين (LTR)',
    arabic: 'العربية',
    arabicDesc: 'واجهة متكاملة باللغة العربية مع دعم كامل لاتجاه اليمين إلى اليسار (RTL)',
    saveChanges: 'حفظ التعديلات',
    savedSuccessfully: 'تم حفظ الإعدادات بنجاح',
    appearance: 'المظهر والسمة',
    appearanceSubtitle: 'اختر المظهر المرئي المفضل لواجهة النظام',
    lightMode: 'الوضع الفاتح (نهاري)',
    darkMode: 'الوضع الداكن (ليلي)',
    systemMode: 'تلقائي (حسب النظام)',
    personalInfo: 'المعلومات الشخصية',
    personalInfoSubtitle: 'بيانات الهوية المعتمدة والمسجلة في المؤسسة التعليمية',
    fullName: 'الاسم الكامل',
    emailAddress: 'البريد الإلكتروني',
    assignedRole: 'الدور والصلاحية',
    staffNumber: 'الرقم الوظيفي / المعرف',
    accountStatus: 'حالة الحساب',
    activeAccount: 'نشط وموثق',
    viewStaffProfile: 'عرض السجل الوظيفي الكامل',
    security: 'الأمان والوصول',
    securitySubtitle: 'بيانات تسجيل الدخول ورمز البصمة لأجهزة الحضور',
    biometricBasPin: 'رمز الدخول السريع لأجهزة البصمة (BAS PIN)',
    changePassword: 'تغيير كلمة المرور',
    
    dashboard: 'لوحة التحكم العامة',
    overview: 'نظرة عامة',
    totalStudents: 'إجمالي الطلاب',
    activeStudents: 'الطلاب المسجلين',
    licensedCapacity: 'سعة الترخيص',
    status: 'الحالة',
    actions: 'الإجراءات',
    filter: 'تصفية',
    print: 'طباعة',
    exportCsv: 'تصدير CSV',
    submit: 'إرسال',
    cancel: 'إلغاء',
    edit: 'تعديل',
    delete: 'حذف',
    view: 'عرض',
    loading: 'جاري التحميل...',
    noDataFound: 'لا توجد بيانات متاحة',
    
    academics: 'الشؤون الأكاديمية والدرجات',
    enterScores: 'رصد درجات الاختبارات والامتحان',
    gradebook: 'دفتر الدرجات المتقدم',
    reviewScores: 'تدقيق ومراجعة الدرجات',
    midtermResults: 'نتائج منتصف الفصل (الميدتيرم)',
    tahfeezTracker: 'متابعة حفظ القرآن الكريم',
    resultsBroadsheet: 'المسودة الشاملة للنتائج',
    generateResults: 'معالجة وترتيب النتائج',
    viewResults: 'بطاقات درجات الطلاب',
    lessonPlans: 'خطط الدروس والتحضير',
    examQuestions: 'نماذج أسئلة الامتحانات',
    
    students: 'الطلاب والقبول',
    studentDirectory: 'سجل ودليل الطلاب',
    studentAdmissions: 'تسجيل وقبول طالب جديد',
    studentPromotions: 'ترقية وتصعيد الفصول',
    
    finance: 'المالية والحسابات',
    invoices: 'الرسوم والفواتير المدرسية',
    payments: 'إيصالات وسندات القبض',
    feeStructures: 'هياكل الرسوم الدراسية',
    payroll: 'مسير رواتب الموظفين',
    generalLedger: 'دفتر الأستاذ العام',
    chartOfAccounts: 'دليل وشجرة الحسابات',
    financialReports: 'القوائم والتقارير المالية',
    
    attendance: 'الحضور والانصراف والبصمة',
    staffAttendance: 'سجل بصمة الموظفين (BAS)',
    dailyAttendance: 'السجل اليومي',
    kiosks: 'أجهزة البصمة الذكية',
    shifts: 'ورديات ومواعيد الدوام',
    holidays: 'العطلات المدرسية الرسمية',

    recruitment: 'التوظيف واستقطاب الكفاءات',
    fleet: 'إدارة أسطول الحافلات والنقل',
    assets: 'إدارة الأصول الثابتة والعهد',
    inventory: 'المخزون ومستلزمات المدرسة',
    timetable: 'الجدول المدرسي والحصص',
    seatingPlans: 'مخططات توزيع لجان الامتحانات',
    examRegistration: 'تسجيل وأرقام جلوس الامتحانات',
    behaviouralAssessment: 'التقييم السلوكي والمواظبة',
    
    administration: 'النظام والإدارة',
    academicYear: 'العام الدراسي والفصول',
    classesAndSubjects: 'الفصول والمواد الدراسية',
    staffManagement: 'سجل الكادر التعليمي والإداري',
    rolesPermissions: 'الأدوار والصلاحيات',
    schoolInfo: 'بيانات وهوية المدرسة',
    licenseCapacity: 'الاشتراك وسعة الطلاب',
    database: 'محرك وقاعدة البيانات',
    logsAndSecurity: 'سجلات التدقيق والأمان',
    notifications: 'الإشعارات والتنبيهات',
    messaging: 'الرسائل الداخلية',
    announcements: 'التعاميم والإعلانات',
    reportsAndAnalytics: 'التقارير والإحصائيات العامة',
    tuitionWallet: 'محفظة الرسوم والمصاريف',
    feeInvoices: 'فواتير الرسوم الدراسية',
    attendanceLog: 'سجل الحضور والغياب',
    classTimetable: 'جدول الحصص الأسبوعي',
    reportCards: 'بطاقات درجات وتقارير الأداء',
    hostels: 'سكن الطلاب والداخلي',
    bedspaceAllocations: 'توزيع وتسكين الأسرة',
    hostelBooking: 'حجز السكن الداخلي',
    tuitionPayments: 'دفع الرسوم الجامعية',
    courseRegistration: 'تسجيل المقررات',
    senateApprovals: 'اعتماد نتائج مجلس الكلية',
    tertiaryStudentHub: 'بوابة وأنشطة الطالب',

    // Extended ERP & Management
    staffLoans: 'سلف وقروض الموظفين',
    expenses: 'المصروفات التشغيلية',
    inventoryOrders: 'أوامر الشراء والتوريد',
    inventorySuppliers: 'دليل الموردين المعتمدين',
    inventoryTransactions: 'حركات وإدخالات المخزون',
    aiSettings: 'إعدادات الذكاء الاصطناعي',
    feeSetup: 'هياكل وفئات الرسوم',
    gradingPolicy: 'سلالم وسياسة التقديرات',
    systemMaintenance: 'صيانة وترقية النظام',
    communicationsSetup: 'بوابات البريد والرسائل',
    uploadScores: 'رفع كشوف الدرجات',
    uploadMidterm: 'رفع درجات الميدتيرم',
    resultTokens: 'بطاقات وكروت الاستعلام',
    printResults: 'طباعة الشهادات المدرسية',
    printMidterm: 'طباعة كشوف الميدتيرم',
    classResults: 'كشف درجات الفصل',
    sltDashboard: 'لوحة القيادة المدرسية',
    sltAcademics: 'مراقبة التحصيل الأكاديمي',
    hodDashboard: 'إدارة القسم الأكاديمي',
    hodAnalytics: 'إحصائيات وتحليلات القسم',
  },
};
