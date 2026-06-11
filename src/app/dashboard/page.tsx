
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function DashboardRedirect() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  if (session.user.isSuperAdmin) {
    redirect('/super-admin');
  }

  if (session.user.schoolId) {
    // We need to find the school subdomain to redirect correctly
    // But since we are already authenticated, we can just use the user data
    // In a real app, we'd fetch the school subdomain here.
    // For now, if we are on a subdomain, the middleware should have handled this.
    // If we are on the root domain, we need the school slug.
    
    // For testing on localhost:9002/dashboard:
    // We'll try to find the school subdomain from the DB.
    const { prisma } = await import('@/lib/prisma');
    const school = await prisma.school.findUnique({
      where: { id: session.user.schoolId },
      select: { subdomain: true }
    });

    if (school) {
      redirect(`/${school.subdomain}/dashboard`);
    }
  }

  redirect('/');
}
