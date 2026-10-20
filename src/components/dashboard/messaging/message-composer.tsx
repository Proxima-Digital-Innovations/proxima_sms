'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2, Users, AlertCircle, MessageSquare, Mail, Radio } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { sendMessageBlast } from '@/actions/messaging-actions';

interface MessageComposerProps {
  schoolId: string;
  classes: Array<{
    id: string;
    name: string;
    _count?: { currentStudents: number };
  }>;
  parentCount?: number;
  staffCount?: number;
  isWhatsAppEnabled?: boolean;
  emailProvider?: string;
}

export function MessageComposer({
  schoolId,
  classes,
  parentCount = 80,
  staffCount = 19,
  isWhatsAppEnabled = false,
  emailProvider = 'SMTP',
}: MessageComposerProps) {
  const [audienceType, setAudienceType] = useState('ALL_PARENTS');
  const [targetClass, setTargetClass] = useState('ALL');
  const [channel, setChannel] = useState('EMAIL');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toast } = useToast();
  const router = useRouter();

  // Compute estimated audience size
  const getEstimatedAudienceCount = (): number => {
    switch (audienceType) {
      case 'ALL_PARENTS':
        return parentCount;
      case 'ALL_STAFF':
        return staffCount;
      case 'CLASS_PARENTS':
      case 'CLASS_STUDENTS': {
        if (targetClass === 'ALL') {
          return classes.reduce((sum, c) => sum + (c._count?.currentStudents || 0), 0);
        }
        const selected = classes.find(c => c.id === targetClass);
        return selected?._count?.currentStudents || 0;
      }
      default:
        return 0;
    }
  };

  const estimatedRecipients = getEstimatedAudienceCount();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Subject and Body are required before sending broadcast.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await sendMessageBlast({
        schoolId,
        audienceType,
        targetId: targetClass === 'ALL' ? null : targetClass,
        channel,
        subject: subject.trim(),
        body: body.trim(),
      });

      if (res && res.success) {
        if (res.warning) {
          toast({
            title: 'Broadcast Dispatched with Notice',
            description: `${res.warning} (${res.sentCount} delivered).`,
          });
        } else {
          toast({
            title: 'Broadcast Sent Successfully',
            description: `Message blast delivered to ${res.sentCount} recipients via ${channel}.`,
          });
        }
        router.push(`/dashboard/messaging`);
        router.refresh();
      } else {
        toast({
          variant: 'destructive',
          title: 'Broadcast Failed',
          description: res?.error || 'Failed to dispatch message blast.',
        });
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Broadcast Error',
        description: err?.message || 'Failed to send message.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto border border-border">
      <CardHeader>
        <CardTitle className="text-xl">Compose Broadcast</CardTitle>
        <CardDescription>
          Send notifications to guardians, faculty, or class cohorts via Email, WhatsApp, or SMS.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Target Audience</Label>
              <Select value={audienceType} onValueChange={setAudienceType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL_PARENTS">All Parents ({parentCount})</SelectItem>
                  <SelectItem value="ALL_STAFF">All Faculty & Staff ({staffCount})</SelectItem>
                  <SelectItem value="CLASS_PARENTS">Parents of Specific Class</SelectItem>
                  <SelectItem value="CLASS_STUDENTS">Students of Specific Class</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Delivery Channel</Label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMAIL">
                    <span className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-blue-500" />
                      Email ({emailProvider})
                    </span>
                  </SelectItem>
                  <SelectItem value="WHATSAPP">
                    <span className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-emerald-500" />
                      WhatsApp {isWhatsAppEnabled ? '(Active)' : '(Setup Required)'}
                    </span>
                  </SelectItem>
                  <SelectItem value="SMS">
                    <span className="flex items-center gap-2">
                      <Radio className="w-4 h-4 text-amber-500" />
                      SMS Relay
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {(audienceType === 'CLASS_PARENTS' || audienceType === 'CLASS_STUDENTS') && (
            <div className="space-y-2">
              <Label>Target Class Cohort</Label>
              <Select value={targetClass} onValueChange={setTargetClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a class..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Classes (Aggregate)</SelectItem>
                  {classes.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c._count?.currentStudents !== undefined ? `(${c._count.currentStudents} students)` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Live Audience Estimate Banner */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border text-xs">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground font-medium">Estimated Audience:</span>
              <Badge variant="secondary" className="font-semibold">
                {estimatedRecipients} recipient{estimatedRecipients === 1 ? '' : 's'}
              </Badge>
            </div>
            <span className="text-muted-foreground">
              Relay: <strong className="text-foreground">{channel}</strong>
            </span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="broadcast-subject">Subject</Label>
            <Input
              id="broadcast-subject"
              placeholder="e.g. 2nd Term Examination Schedule & Resumption Notice"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="broadcast-body">Message Body</Label>
            <Textarea
              id="broadcast-body"
              placeholder="Write your broadcast announcement here..."
              className="min-h-[200px]"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <div className="text-xs text-muted-foreground flex justify-between pt-1">
              <span>Personalization Tags: <code>{"{firstName}"}</code>, <code>{"{schoolName}"}</code></span>
              <span>{body.length} characters</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t border-border p-6 bg-muted/10">
          <Button variant="outline" type="button" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="flex items-center gap-2">
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Dispatch Broadcast
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

