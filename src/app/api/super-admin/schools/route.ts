import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth'; // Assuming next-auth or similar

export async function GET(request: Request) {
  try {
    const session = await auth();
    // Verify super admin
    if (!session?.user?.isSuperAdmin) {
      return new NextResponse('Unauthorized', { status: 403 });
    }

    const schools = await prisma.school.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(schools);
  } catch (error) {
    console.error('Error fetching schools:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
