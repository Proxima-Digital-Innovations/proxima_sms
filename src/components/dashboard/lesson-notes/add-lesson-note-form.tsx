'use client';

import React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { UploadCloud, Loader2 } from 'lucide-react';
import { useRole } from '@/context/role-context';
import { useState, useEffect } from 'react';
import { useAcademicData } from '@/hooks/use-academic-data';
import type { MockLessonNote } from '@/lib/schema';
import { submitLessonNote } from '@/actions/lms-actions';
import { useSession } from 'next-auth/react';

const formSchema = z.object({
  title: z.string().optional(),
  type: z.enum(['Lesson Plan', 'Exam Question', 'Test Question']),
  paperType: z.string().optional(),
  class: z.string().min(1, { message: 'Please select a class.' }),
  subject: z.string().min(1, { message: 'Please select a subject.' }),
  file: z.any().refine((files) => files?.length >= 1, 'File is required.'),
});

const resubmissionSchema = formSchema.extend({
  file: z.any().optional(),
});


export function DocumentSubmissionForm({
  onNoteAdded,
  documentType,
  existingNoteData,
  isResubmission = false,
}: {
  onNoteAdded: () => void;
  documentType?: 'Lesson Plan' | 'Exam Question' | 'Test Question';
  existingNoteData?: MockLessonNote | null;
  isResubmission?: boolean;
}) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileRef = React.useRef<HTMLInputElement>() as React.MutableRefObject<HTMLInputElement>;
  const { classes, subjects, isLoading: isAcademicDataLoading } = useAcademicData();

  const currentSchema = isResubmission ? resubmissionSchema : formSchema;

  const form = useForm<z.infer<typeof currentSchema>>({
    resolver: zodResolver(currentSchema),
    defaultValues: {
      title: existingNoteData?.title || '',
      type: documentType || 'Lesson Plan',
      paperType: '',
      class: existingNoteData?.class || '',
      subject: existingNoteData?.subject || '',
    },
  });

  const documentTypeValue = form.watch('type');
  const showTypeSelector = !documentType;

  useEffect(() => {
    if (documentType) {
        form.setValue('type', documentType);
    }
     if (isResubmission && existingNoteData) {
      form.reset({
        title: existingNoteData.title,
        class: existingNoteData.class,
        subject: existingNoteData.subject,
        type: documentType || 'Lesson Plan',
      });
    }
  }, [documentType, form, isResubmission, existingNoteData]);

  async function onSubmit(values: z.infer<typeof currentSchema>) {
    if (!session?.user?.id) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be logged in to submit a document.',
      });
      return;
    }

    if (!values.file || values.file.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'A file is required for submission.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const file = values.file[0];
      const formData = new FormData();
      
      formData.append('teacherId', session.user.id);
      formData.append('title', values.title || file.name.replace(/\.[^/.]+$/, ''));
      formData.append('type', values.type);
      formData.append('class', values.class);
      formData.append('subject', values.subject);
      formData.append('file', file);
      
      if (values.paperType) {
          formData.append('paperType', values.paperType);
      }

      const result = await submitLessonNote(formData);
      
      if (!result.success) {
          throw new Error(result.error);
      }

      toast({
        title: 'Document Submitted',
        description: `Your ${values.type} has been successfully submitted.`,
      });
      
      form.reset();
      if (fileRef.current) {
        fileRef.current.value = '';
      }
      onNoteAdded();
    } catch (e: any) {
      console.error('Error submitting document: ', e);
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description:
          e.message || 'There was a problem submitting your document.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
        
        {documentType === 'Lesson Plan' && (
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Document Title</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Week 1 - Introduction to Algebra" {...field} disabled={isResubmission} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="grid grid-cols-2 gap-4">
          {showTypeSelector && (
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value} disabled={!!documentType || isResubmission}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select document type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                          <SelectItem value="Lesson Plan">Lesson Plan</SelectItem>
                          <SelectItem value="Exam Question">Exam Question</SelectItem>
                          <SelectItem value="Test Question">Test Question (CA)</SelectItem>
                      </SelectContent>
                    </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

           {(documentTypeValue === 'Test Question' || documentTypeValue === 'Exam Question') && (
            <FormField
              control={form.control}
              name="paperType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Paper Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select paper type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1st CA">1st CA</SelectItem>
                      <SelectItem value="2nd CA">2nd CA</SelectItem>
                      <SelectItem value="Exam">Exam</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>
         <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isAcademicDataLoading || isResubmission}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={isAcademicDataLoading ? "Loading..." : "Select Subject"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {subjects.map(subject => (
                          <SelectItem key={subject.id} value={subject.name}>{subject.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="class"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Class Level</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isAcademicDataLoading || isResubmission}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={isAcademicDataLoading ? "Loading..." : "Select Class"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {classes.map(c => (
                          <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
         </div>
        <FormField
          control={form.control}
          name="file"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{isResubmission ? 'New Document File' : 'Document File'}</FormLabel>
              <FormControl>
                <Input
                  type="file"
                  accept=".pdf, .doc, .docx, .xls, .xlsx"
                  ref={fileRef}
                  onChange={(e) => field.onChange(e.target.files)}
                />
              </FormControl>
              <FormDescription>
                {isResubmission ? 'Upload the corrected version of your document.' : 'Upload your document here. The title will be the filename if not specified.'}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
             <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
            </>
          ) : (
            <>
              <UploadCloud className="mr-2 h-4 w-4" /> {isResubmission ? 'Resubmit for Review' : 'Submit for Review'}
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
