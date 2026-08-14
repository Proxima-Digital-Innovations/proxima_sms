import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, Send, Users, Mail, MessageCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export default async function MessagingDashboardPage({ params }: { params: Promise<{ school: string }> }) {
  
  
  const school = await prisma.systemProfile.findFirst();

  if (!school) return null;

  const blasts = await prisma.messageBlast.findMany({
    where: { },
    orderBy: { sentAt: 'desc' },
    include: {
      sender: {
        select: { firstName: true, lastName: true }
      }
    }
  });

  const totalSent = blasts.reduce((acc, curr) => acc + curr.sentCount, 0);

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Messaging & Communications</h2>
          <p className="text-muted-foreground mt-1">Broadcast SMS and Emails to Parents, Staff, and Students.</p>
        </div>
        <Link href={`/dashboard/messaging/compose`}>
          <Button className="flex items-center gap-2">
            <Send className="w-4 h-4" />
            New Broadcast
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Broadcasts</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{blasts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages Sent</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Credits</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Unlimited</div>
            <p className="text-xs text-muted-foreground mt-1">Mock Provider Active</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Broadcasts</CardTitle>
        </CardHeader>
        <CardContent>
          {blasts.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p>No broadcasts have been sent yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {blasts.map((blast) => (
                <div key={blast.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-start gap-4">
                    <div className="mt-1">
                      {blast.channel === 'EMAIL' ? (
                        <Mail className="w-5 h-5 text-blue-500" />
                      ) : (
                        <MessageCircle className="w-5 h-5 text-green-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold">{blast.subject}</p>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{blast.body}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" /> {blast.audienceType}
                        </span>
                        <span>•</span>
                        <span>Sent by {blast.sender.firstName} {blast.sender.lastName}</span>
                        <span>•</span>
                        <span>{format(new Date(blast.sentAt), 'MMM d, yyyy h:mm a')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-500">
                      {blast.sentCount} Delivered
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
