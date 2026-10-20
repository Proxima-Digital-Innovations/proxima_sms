import { PrismaClient } from '@prisma/client'; 
const prisma = new PrismaClient(); 

async function run() { 
  const perms = [
    {action: 'manage', resource: 'kiosk', description: 'Manage Biometric Kiosks'}, 
    {action: 'manage', resource: 'holidays', description: 'Manage School Holidays'}, 
    {action: 'manage', resource: 'roles', description: 'Manage System Roles'}
  ]; 
  
  for (const p of perms) { 
    await prisma.permission.upsert({ 
      where: { action_resource: { action: p.action, resource: p.resource } }, 
      update: {}, 
      create: p 
    }); 
  } 
  
  await prisma.accessRole.update({ 
    where: { name: 'HR Manager' }, 
    data: { 
      permissions: { 
        connect: [
          { action_resource: { action: 'manage', resource: 'kiosk'} }, 
          { action_resource: { action: 'manage', resource: 'holidays'} }
        ] 
      } 
    } 
  }); 
  
  // Also create a dedicated 'System Admin' role that can manage roles
  await prisma.accessRole.upsert({
    where: { name: 'System Admin' },
    update: {},
    create: {
      name: 'System Admin',
      description: 'Can manage roles and system settings',
      permissions: {
        connect: [
          { action_resource: { action: 'manage', resource: 'roles' } }
        ]
      }
    }
  });

  console.log('Permissions updated!'); 
} 

run()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
