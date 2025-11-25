

'use client';

import React, { useState, useTransition } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, File as FileIcon, X, UploadCloud } from 'lucide-react';
import { useAcademicData } from '@/hooks/use-academic-data';
import { bulkUploadDocuments } from '@/actions/submission-actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRole } from '@/context/role-context';

const fileSchema = z.object({
  file: z.instanceof(File),
  title: z.string().min(1, 'Title is required.'),
  type: z.enum(['Lesson Plan', 'Exam Question', 'Test Question']),
  class: z.string().min(1, 'Class is required.'),
  subject: z.string().min(1, 'Subject is required.'),
});

const formSchema = z.object({
  files: z.array(fileSchema).min(1, 'Please select at least one file.'),
});

type BulkUploadFormValues = z.infer<typeof formSchema>;

export function BulkUploadForm() {
  const { user } = useRole();
  const { toast } = useToast();
  const [isSubmitting, startTransition] = useTransition();
  const { classes, subjects, isLoading: isAcademicDataLoading } = useAcademicData();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const form = useForm<BulkUploadFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      files: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'files',
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const newFiles = selectedFiles.map(file => ({
      file,
      title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension for default title
      type: 'Lesson Plan' as const,
      class: '',
      subject: '',
    }));
    append(newFiles);
  };

  const onSubmit = async (values: BulkUploadFormValues) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      
      // Append user ID
      formData.append('userId', user.uid);
      
      // Append file metadata as a JSON string
      const metadata = values.files.map(f => ({
        name: f.file.name,
        title: f.title,
        type: f.type,
        class: f.class,
        subject: f.subject,
      }));
      formData.append('metadata', JSON.stringify(metadata));

      // Append files
      values.files.forEach((f, index) => {
        formData.append(`file_${index}`, f.file);
      });

      try {
        const result = await bulkUploadDocuments(formData);
        if (result.error) throw new Error(result.error);
        
        toast({
          title: 'Upload Successful!',
          description: `${result.successCount} documents have been submitted for review.`,
        });
        form.reset();
        if (fileInputRef.current) fileInputRef.current.value = '';

      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Upload Failed', description: error.message });
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="rounded-lg border-2 border-dashed p-8 text-center">
            <input
                type="file"
                multiple
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
            />
            <Button type="button" variant="outline" size="lg" onClick={() => fileInputRef.current?.click()}>
                <UploadCloud className="mr-2 h-5 w-5" />
                Select Files to Upload
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">You can select multiple documents at once.</p>
        </div>

        {fields.length > 0 && (
          <div className="space-y-4">
            {fields.map((field, index) => (
              <Card key={field.id} className="bg-secondary/50">
                <CardHeader className="flex flex-row items-start justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <FileIcon className="h-4 w-4" />
                            {field.file.name}
                        </CardTitle>
                    </div>
                     <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                        <X className="h-4 w-4" />
                    </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                     <FormField
                        control={form.control}
                        name={`files.${index}.title`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Document Title</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                         <FormField
                            control={form.control}
                            name={`files.${index}.type`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Type</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
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
                         <FormField
                            control={form.control}
                            name={`files.${index}.class`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Class</FormLabel>
                                     <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isAcademicDataLoading}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select Class..." /></SelectTrigger></FormControl>
                                        <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name={`files.${index}.subject`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Subject</FormLabel>
                                     <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isAcademicDataLoading}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select Subject..." /></SelectTrigger></FormControl>
                                        <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-4">
          <Button type="submit" size="lg" disabled={isSubmitting || fields.length === 0}>
            {isSubmitting ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting {fields.length} documents...
                </>
            ) : (
                <>
                    <UploadCloud className="mr-2 h-4 w-4" /> Submit All
                </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
