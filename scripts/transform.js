const fs = require('fs');
const path = require('path');

// Paths
const INPUT_FILE = path.join(__dirname, '../../giia.com.ng/initial_data.json');
const OUTPUT_FILE = path.join(__dirname, '../data/firestore_data.json');

// Ensure output directory exists
const outputDir = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Read Input Data
console.log('Reading input file...');
const rawData = fs.readFileSync(INPUT_FILE, 'utf8');
const djangoData = JSON.parse(rawData);

console.log(`Loaded ${djangoData.length} records from Django export.`);

// Helper to find objects by model and pk
const findByPk = (model, pk) => djangoData.find(item => item.model === model && item.pk === pk);
const filterByModel = (model) => djangoData.filter(item => item.model === model);

// --- Transformation Logic ---

const firestoreData = {
    users: [],
    students: [],
    classes: [],
    subjects: [],
    scores: [],
    payments: [],
    inventory: [],
    tahfeez: [],
    behavioural: []
};

// 1. Users (Staff/Admin)
console.log('Transforming Users...');
const djangoUsers = filterByModel('auth.user');
const djangoStaff = filterByModel('core.staff'); // Assuming core.staff links to auth.user or contains extra info

djangoUsers.forEach(user => {
    // Skip if user is just a student (if students are in auth.user, but usually they are separate)
    // In this schema, 'core.staff' seems to be the profile.
    // We will migrate all auth.users as potential system users.
    
    const userData = {
        uid: `user_${user.pk}`, // We will use this as the document ID/UID
        email: user.fields.email || `user${user.pk}@school.com`,
        firstName: user.fields.first_name || user.fields.username,
        lastName: user.fields.last_name || '',
        role: user.fields.is_superuser ? 'admin' : (user.fields.is_staff ? 'teacher' : 'parent'), // Default mapping
        createdAt: new Date(user.fields.date_joined).toISOString(),
        // Password cannot be migrated directly. 
        // We will set a flag or handle this in seed script (e.g., set default password).
    };
    firestoreData.users.push(userData);
});

// 2. Classes
console.log('Transforming Classes...');
const djangoClasses = filterByModel('src.schoolclass');
djangoClasses.forEach(cls => {
    firestoreData.classes.push({
        id: `class_${cls.pk}`,
        name: `${cls.fields.name} ${cls.fields.arm}`,
        level: cls.fields.level,
        arm: cls.fields.arm
    });
});

// 3. Subjects
console.log('Transforming Subjects...');
const djangoSubjects = filterByModel('src.subject');
djangoSubjects.forEach(sub => {
    firestoreData.subjects.push({
        id: `subject_${sub.pk}`,
        name: sub.fields.name
    });
});

// 4. Students & Guardians
console.log('Transforming Students...');
const djangoStudents = filterByModel('src.student');

djangoStudents.forEach(student => {
    // Find Guardians
    const guardians = [];
    if (student.fields.guardians) {
        student.fields.guardians.forEach(guardianPk => {
            const g = findByPk('src.guardian', guardianPk);
            if (g) {
                guardians.push({
                    fullName: `${g.fields.first_name} ${g.fields.last_name}`,
                    relationship: g.fields.relationship,
                    phone: g.fields.phone_number,
                    email: g.fields.email || '',
                    address: '', // Not in guardian model, maybe in student
                    isPrimary: guardians.length === 0 // First one is primary
                });
            }
        });
    }

    // Find Class Name
    const enrolledClass = student.fields.enrolled_class ? findByPk('src.schoolclass', student.fields.enrolled_class) : null;
    const className = enrolledClass ? `${enrolledClass.fields.name} ${enrolledClass.fields.arm}` : 'Unassigned';

    firestoreData.students.push({
        id: `student_${student.pk}`,
        studentId: student.fields.admission_number || `STU${student.pk}`,
        firstName: student.fields.first_name,
        lastName: student.fields.last_name,
        gender: student.fields.gender || 'Other',
        dateOfBirth: student.fields.date_of_birth,
        classLevel: className, // Using class name as level for now
        sessionYear: '2024/2025', // Default or fetch from active session
        guardians: guardians,
        status: student.fields.status === 'active' ? 'Active' : 'Inactive',
        createdAt: student.fields.created_at || new Date().toISOString(),
        address: student.fields.address,
        address: student.fields.address,
        photoPath: student.fields.image ? student.fields.image.replace('pics/', '') : null
    });
});

// 5. Results (Scores)
console.log('Transforming Results...');
const djangoResults = filterByModel('src.result');
djangoResults.forEach(res => {
    const student = findByPk('src.student', res.fields.student);
    const subject = findByPk('src.subject', res.fields.subject);
    const term = findByPk('src.term', res.fields.term);
    const session = findByPk('src.session', res.fields.session);
    const cls = findByPk('src.schoolclass', res.fields.class_assigned);

    if (student && subject) {
        firestoreData.scores.push({
            id: `score_${res.pk}`,
            studentId: `student_${res.fields.student}`,
            studentName: `${student.fields.first_name} ${student.fields.last_name}`,
            subject: subject.fields.name,
            class: cls ? `${cls.fields.name} ${cls.fields.arm}` : 'Unknown',
            term: term ? term.fields.name : 'Unknown',
            session: session ? session.fields.name : 'Unknown',
            caScore: (res.fields.ca1_marks || 0) + (res.fields.ca2_marks || 0) + (res.fields.home_work_marks || 0) + (res.fields.activity_marks || 0),
            examScore: res.fields.exam_marks || 0,
            totalScore: 0, // Will be calculated or is sum
            status: 'Approved' // Legacy results are approved
        });
    }
});

// 6. Payments
console.log('Transforming Payments...');
const djangoPayments = filterByModel('src.payment');
djangoPayments.forEach(pay => {
    const student = findByPk('src.student', pay.fields.student);
    const fee = findByPk('src.feestructure', pay.fields.fee_structure);
    
    if (student) {
        firestoreData.payments.push({
            id: `payment_${pay.pk}`,
            studentId: `student_${pay.fields.student}`,
            studentName: `${student.fields.first_name} ${student.fields.last_name}`,
            amountPaid: parseFloat(pay.fields.amount_paid),
            paymentDate: pay.fields.payment_date,
            paymentMethod: pay.fields.payment_method === 'bank_transfer' ? 'Bank Transfer' : 'Cash',
            notes: fee ? fee.fields.description : '',
            status: 'Paid'
        });
    }
});

// 7. Inventory (New)
console.log('Transforming Inventory...');
const djangoItems = filterByModel('src.item');
djangoItems.forEach(item => {
    const category = item.fields.category ? findByPk('src.category', item.fields.category) : null;
    firestoreData.inventory.push({
        id: `item_${item.pk}`,
        name: item.fields.name,
        category: category ? category.fields.name : 'General',
        description: item.fields.description,
        quantityInStock: item.fields.quantity_in_stock,
        reorderLevel: item.fields.reorder_level,
        expiryDate: item.fields.expiry_date,
        createdAt: new Date().toISOString()
    });
});

// 8. Tahfeez (New)
console.log('Transforming Tahfeez Results...');
const djangoTahfeez = filterByModel('src.tahfeezresult');
djangoTahfeez.forEach(res => {
    const student = findByPk('src.student', res.fields.student);
    const session = findByPk('src.session', res.fields.session);
    const term = findByPk('src.term', res.fields.term);
    const cls = findByPk('src.schoolclass', res.fields.class_assigned);

    if (student) {
        firestoreData.tahfeez.push({
            id: `tahfeez_${res.pk}`,
            studentId: `student_${res.fields.student}`,
            studentName: `${student.fields.first_name} ${student.fields.last_name}`,
            marks: res.fields.marks,
            session: session ? session.fields.name : 'Unknown',
            term: term ? term.fields.name : 'Unknown',
            class: cls ? `${cls.fields.name} ${cls.fields.arm}` : 'Unknown',
            createdAt: new Date().toISOString()
        });
    }
});

// Write Output
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(firestoreData, null, 2));
console.log(`Transformation complete. Data saved to ${OUTPUT_FILE}`);
