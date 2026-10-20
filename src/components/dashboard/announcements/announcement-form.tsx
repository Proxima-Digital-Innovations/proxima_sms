
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { saveAnnouncement } from '@/actions/announcement-actions';
import { useState, useTransition } from 'react';
import { Loader2, Send, Sparkles } from 'lucide-react';
import { useRole } from '@/context/role-context';
import type { Announcement } from '@/lib/schema';
import { aiEngine } from '@/ai';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3, 'Title must be at least 3 characters long.'),
  content: z.string().min(10, 'Content must be at least 10 characters long.'),
  notifyParents: z.boolean().default(false).optional(),
});

type AnnouncementFormValues = z.infer<typeof formSchema>;

interface AnnouncementFormProps {
  initialData?: Announcement;
  onFormSubmit: (success: boolean) => void;
}

export function AnnouncementForm({ initialData, onFormSubmit }: AnnouncementFormProps) {
  const { toast } = useToast();
  const { user } = useRole();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiGenerating, startAiTransition] = useTransition();
  const [aiTopic, setAiTopic] = useState('Announce a 3-day mid-term break starting next Monday.');
  const [aiAudience, setAiAudience] = useState<'Parents' | 'Staff' | 'All Users'>('All Users');
  const [aiTone, setAiTone] = useState<'Formal' | 'Friendly' | 'Urgent'>('Formal');
  const [aiError, setAiError] = useState('');


  const form = useForm<AnnouncementFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: initialData?.id,
      title: initialData?.title || '',
      content: initialData?.content || '',
    },
  });

  const handleGenerateContent = () => {
    if (!aiTopic) {
      setAiError('Please enter a topic for the AI to write about.');
      return;
    }
    setAiError('');
    startAiTransition(async () => {
      try {
        const result = await aiEngine.text.draft({
          topic: aiTopic,
          audience: aiAudience,
          tone: aiTone,
        });
        if (result.draft) {
          form.setValue('content', result.draft, { shouldValidate: true });
        }
      } catch (e) {
        console.error(e);
        setAiError('Failed to generate content. Please try again.');
      }
    });
  };


  const onSubmit = async (values: AnnouncementFormValues) => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
        return;
    }
    setIsSubmitting(true);
    try {
      const result = await saveAnnouncement({ ...values });
      
      // If the result contains a validation or execution error, display it and stop
      if (result && 'error' in result && typeof result.error === 'string') {
          toast({ variant: 'destructive', title: 'Error', description: result.error });
          throw new Error('Validation failed.');
      }
      
      toast({ title: 'Success', description: 'Announcement saved successfully.' });
      onFormSubmit(true);
    } catch (error: any) {
      if (error.message !== 'Validation failed.') {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
        <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
            <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                    <Input placeholder="e.g., Mid-term Break Announcement" {...field} />
                </FormControl>
                <FormMessage />
            </FormItem>
            )}
        />
        
        <div className="space-y-4 rounded-lg border p-4">
            <h3 className="text-sm font-medium">AI Content Assistant</h3>
            <p className="text-xs text-muted-foreground">Give the AI a topic and context, and let it draft the announcement content for you.</p>
             <Textarea
                placeholder="Enter a topic for the AI to expand on. e.g., Announce a 3-day mid-term break starting next Monday."
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                rows={2}
            />
            <div className="grid grid-cols-2 gap-4">
              <Select onValueChange={(value) => setAiAudience(value as any)} defaultValue={aiAudience}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Users">All Users</SelectItem>
                  <SelectItem value="Parents">Parents</SelectItem>
                  <SelectItem value="Staff">Staff</SelectItem>
                </SelectContent>
              </Select>
               <Select onValueChange={(value) => setAiTone(value as any)} defaultValue={aiTone}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Formal">Formal</SelectItem>
                  <SelectItem value="Friendly">Friendly</SelectItem>
                  <SelectItem value="Urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {aiError && <p className="text-xs text-destructive">{aiError}</p>}
            <Button type="button" onClick={handleGenerateContent} disabled={isAiGenerating} variant="outline" size="sm">
                {isAiGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Generate Content
            </Button>
        </div>


        <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
            <FormItem>
                <FormLabel>Full Announcement Content</FormLabel>
                <FormControl>
                    <Textarea placeholder="Enter the full announcement details here..." {...field} rows={8} />
                </FormControl>
                <FormMessage />
            </FormItem>
            )}
        />
        
        <FormField
            control={form.control}
            name="notifyParents"
            render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                    <FormLabel className="text-base">Notify Parents</FormLabel>
                    <p className="text-sm text-muted-foreground">
                        Automatically send this announcement to all parents/guardians via email.
                    </p>
                </div>
                <FormControl>
                    <input 
                      type="checkbox" 
                      className="h-5 w-5 accent-primary" 
                      checked={field.value} 
                      onChange={field.onChange} 
                    />
                </FormControl>
            </FormItem>
            )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="ghost" onClick={() => onFormSubmit(false)}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            {initialData ? 'Save Changes' : 'Publish Announcement'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
