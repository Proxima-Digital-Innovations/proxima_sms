import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Comprehensive RBAC Setup...');

  // 1. Create All System Permissions
  const permissions = [
    // BAS
    { action: 'read', resource: 'attendance', description: 'View attendance logs and reports' },
    { action: 'manage', resource: 'attendance', description: 'Full access to attendance module (edit logs, shifts)' },
    { action: 'manage', resource: 'kiosk', description: 'Activate and manage biometric kiosks' },
    
    // Inventory
    { action: 'read', resource: 'inventory', description: 'View inventory items and stock levels' },
    { action: 'manage', resource: 'inventory', description: 'Add, edit, or delete inventory items' },
    { action: 'approve', resource: 'inventory', description: 'Approve inventory requests' },
    
    // Staff / HR
    { action: 'read', resource: 'staff', description: 'View staff directory' },
    { action: 'manage', resource: 'staff', description: 'Add or remove staff, edit profiles' },
    { action: 'manage', resource: 'roles', description: 'Create and assign security roles' },
    
    // Students
    { action: 'read', resource: 'students', description: 'View student profiles' },
    { action: 'manage', resource: 'students', description: 'Admit, promote, or remove students' },
    
    // Academics
    { action: 'read', resource: 'academics', description: 'View academic records' },
    { action: 'manage', resource: 'academics', description: 'Manage classes, subjects, grading system' },
    { action: 'manage', resource: 'exams', description: 'Manage exam questions, CBT, and seating plans' },
    { action: 'enter', resource: 'scores', description: 'Enter raw exam and continuous assessment scores' },
    { action: 'generate', resource: 'results', description: 'Process and generate term results' },
    
    // Finance
    { action: 'read', resource: 'finance', description: 'View financial reports and invoices' },
    { action: 'manage', resource: 'finance', description: 'Create invoices, process payments and expenses' },
    { action: 'manage', resource: 'payroll', description: 'Manage staff payroll, allowances, and deductions' },
    
    // Communication
    { action: 'read', resource: 'communication', description: 'View system announcements' },
    { action: 'manage', resource: 'communication', description: 'Send school-wide announcements and emails' },
    
    // System
    { action: 'manage', resource: 'settings', description: 'Manage global school settings (logo, name, etc)' },
    { action: 'manage', resource: 'database', description: 'Access raw database and system logs' },
  ];

  console.log(`Ensuring ${permissions.length} core permissions exist...`);
  
  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: {
        action_resource: {
          action: perm.action,
          resource: perm.resource,
        }
      },
      update: { description: perm.description },
      create: perm,
    });
  }

  console.log('Comprehensive RBAC Seed Complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
