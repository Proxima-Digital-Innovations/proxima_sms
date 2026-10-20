import { prisma } from '@/lib/prisma';
import { MessageComposer } from '@/components/dashboard/messaging/message-composer';
import { STAFF_FILTER } from '@/lib/dal/staff-repository';
import { CommEngine } from '@/lib/services/comm-engine';

export default async function MessagingComposePage() {
  const school = await prisma.systemProfile.findFirst();

  if (!school) return null;

  const [classes, parentCount, staffCount, config] = await Promise.all([
    prisma.class.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            currentStudents: { where: { status: 'Active' } },
          },
        },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.guardian.count({
      where: {
        student: {
          status: 'Active',
        },
      },
    }),
    prisma.user.count({
      where: {
        status: 'active',
        ...STAFF_FILTER,
      },
    }),
    CommEngine.getConfig(),
  ]);

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">New Broadcast</h2>
      </div>

      <MessageComposer
        schoolId={school.id}
        classes={classes}
        parentCount={parentCount}
        staffCount={staffCount}
        isWhatsAppEnabled={!!config.whatsapp?.enabled}
        emailProvider={config.emailProvider}
      />
    </div>
  );
}
