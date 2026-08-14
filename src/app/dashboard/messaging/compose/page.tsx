import { prisma } from '@/lib/prisma';
import { MessageComposer } from '@/components/dashboard/messaging/message-composer';

export default async function MessagingComposePage() {
  const school = await prisma.systemProfile.findFirst();

  if (!school) return null;

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">New Broadcast</h2>
      </div>
      
      <MessageComposer schoolId={school.id} classes={[]} />
    </div>
  );
}
