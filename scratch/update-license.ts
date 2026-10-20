import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  await prisma.systemLicense.create({
    data: {
      licenseKey: 'eyJzY2hvb2xOYW1lIjoiUHJveGltYSBBY2FkZW15IiwiaXNzdWVkQXQiOiIyMDI2LTA4LTE3VDA5OjIzOjM2LjAzMloiLCJleHBpcmVzQXQiOiIyMDM2LTA4LTE0VDA5OjIzOjM2LjAzOFoiLCJtYXhTdHVkZW50cyI6MTAwMDAsImZlYXR1cmVzIjpbIkNPUkUiLCJGSU5BTkNFIiwiSFIiLCJJTlZFTlRPUlkiLCJUUkFOU1BPUlQiLCJDQlQiXX0=.NsOWWJmsmSbWPY/evfOvAGBwHgKIxpmr/+8R5Cxb23d9mNt7BntKiwZuAIxHwyfBZzCRT3H9JIqQg3UaY7sT94xEwTL1Bo1tuKmIdIoZ4+usP/DvLsj7z4PC9ZKW0ULnylihWPwmFj3HqaC6H4kLX1uUcxgedWfNwuphC5bvc6/dZrLAlmcZH3fNAZzu8WTi2gePQzNUa9++XsclQx5SLOnfkS5BvfKMuleZfRj3X0P4k5l9UQGiPUUDyq5qQDJuxJ15XpEnH3s8opwsWFM2qtNUg2M0F0uAmt9t9RY4qdyYcMaJi+yRso0owr+xDjuIU3GU8NzJo1PhCYqgTUNefA==',
      schoolName: 'Proxima Academy',
      expiresAt: new Date('2036-08-14T09:23:36.038Z')
    }
  });
  console.log('Updated license in DB');
}
run().finally(() => prisma.$disconnect());
