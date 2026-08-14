'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { sendMessageBlast } from '@/actions/messaging-actions';

export function MessageComposer({ schoolId, classes }: { schoolId: string, classes: any[] }) {
  const [audienceType, setAudienceType] = useState('ALL_PARENTS');
  const [targetClass, setTargetClass] = useState('ALL');
  const [channel, setChannel] = useState('EMAIL');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toast } = useToast();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !body) {
      toast({ variant: 'destructive', title: 'Error', description: 'Subject and Body are required' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await sendMessageBlast({
        schoolId,
        audienceType,
        targetId: targetClass === 'ALL' ? null : targetClass,
        channel,
        subject,
        body
      });

      if (res.success) {
        toast({ title: 'Success', description: `Message blast sent to ${res.sentCount} recipients.` });
        router.push(`/dashboard/messaging`);
        router.refresh();
      } else {
        toast({ variant: 'destructive', title: 'Error', description: res.error });
      }
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to send message' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Compose Broadcast</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Audience</Label>
              <Select value={audienceType} onValueChange={setAudienceType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL_PARENTS">All Parents</SelectItem>
                  <SelectItem value="ALL_STAFF">All Staff</SelectItem>
                  <SelectItem value="CLASS_PARENTS">Parents of Specific Class</SelectItem>
                  <SelectItem value="CLASS_STUDENTS">Students of Specific Class</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Channel</Label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMAIL">Email</SelectItem>
                  <SelectItem value="SMS">SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {(audienceType === 'CLASS_PARENTS' || audienceType === 'CLASS_STUDENTS') && (
            <div className="space-y-2">
              <Label>Select Class</Label>
              <Select value={targetClass} onValueChange={setTargetClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a class..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Classes</SelectItem>
                  {classes.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Subject</Label>
            <Input 
              placeholder="e.g. End of Term Holiday Notice" 
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Message Body</Label>
            <Textarea 
              placeholder="Write your message here..." 
              className="min-h-[200px]"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <p className="text-xs text-muted-foreground flex justify-between">
              <span>Variables: {"{firstName}"}, {"{schoolName}"}</span>
              <span>{body.length} characters</span>
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t p-6">
          <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting} className="flex items-center gap-2">
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send Broadcast
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
