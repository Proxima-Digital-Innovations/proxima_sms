
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Sparkles, AlertCircle } from 'lucide-react';
import { dbService } from '@/lib/dbService';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';

const HARM_CATEGORIES = [
  'HARM_CATEGORY_HATE_SPEECH',
  'HARM_CATEGORY_SEXUALLY_EXPLICIT',
  'HARM_CATEGORY_HARASSMENT',
  'HARM_CATEGORY_DANGEROUS_CONTENT',
] as const;

const THRESHOLDS = [
  'BLOCK_NONE',
  'BLOCK_ONLY_HIGH',
  'BLOCK_MEDIUM_AND_ABOVE',
  'BLOCK_LOW_AND_ABOVE',
] as const;

const safetySettingSchema = z.object({
  category: z.enum(HARM_CATEGORIES),
  threshold: z.enum(THRESHOLDS),
});

const formSchema = z.object({
  safetySettings: z.array(safetySettingSchema),
  temperature: z.number().min(0).max(1),
  maxOutputTokens: z.coerce.number().int().positive().optional(),
});

type FormValues = z.infer<typeof formSchema>;
type AiConfig = z.infer<typeof formSchema>;

export default function AISettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      safetySettings: HARM_CATEGORIES.map(category => ({
        category,
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      })),
      temperature: 0.5,
    },
  });

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const settings = await dbService.getDoc<AiConfig>('system', 'aiConfig');
        if (settings) {
          form.reset({
            safetySettings: settings.safetySettings || HARM_CATEGORIES.map(c => ({ category: c, threshold: 'BLOCK_MEDIUM_AND_ABOVE' })),
            temperature: settings.temperature || 0.5,
            maxOutputTokens: settings.maxOutputTokens || undefined,
          });
        }
      } catch (error) {
        console.error("Failed to fetch AI settings:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load AI configuration.' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, [form, toast]);

  const onSubmit = async (values: FormValues) => {
    try {
      await dbService.setDoc('system', 'aiConfig', values);
      toast({ title: 'Success', description: 'AI settings have been updated. Changes will apply to new AI interactions.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save AI settings.' });
    }
  };

  const getCategoryLabel = (category: string) => {
    return category.replace('HARM_CATEGORY_', '').replace(/_/g, ' ');
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-bold flex items-center gap-2">
          <Sparkles /> AI Engine Configuration
        </h1>
        <p className="text-muted-foreground">
          Manage and configure the behavior of the AI agents used across the portal.
        </p>
      </div>

       <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>AI Model Behavior</CardTitle>
                    <CardDescription>
                        Control the creativity and length of the AI's responses.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {isLoading ? <Skeleton className="h-24 w-full" /> : (
                        <>
                            <FormField
                                control={form.control}
                                name="temperature"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Temperature: {field.value}</FormLabel>
                                    <FormControl>
                                        <Slider
                                            min={0}
                                            max={1}
                                            step={0.1}
                                            value={[field.value]}
                                            onValueChange={(vals) => field.onChange(vals[0])}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Lower values (e.g., 0.2) result in more predictable, factual text. Higher values (e.g., 0.9) result in more creative text.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="maxOutputTokens"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Max Response Length (Tokens)</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="e.g., 1024" {...field} />
                                    </FormControl>
                                     <FormDescription>
                                        The maximum number of tokens the AI can generate in a single response. Leave blank for default.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                <CardTitle>Content Safety Settings</CardTitle>
                <CardDescription>
                    Adjust the content safety filters for the AI model. These settings help block potentially harmful content.
                </CardDescription>
                </CardHeader>
                <CardContent>
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>How It Works</AlertTitle>
                    <AlertDescription>
                    Select a threshold for each category. 'BLOCK_NONE' is the most permissive, while 'BLOCK_LOW_AND_ABOVE' is the strictest.
                    </AlertDescription>
                </Alert>
                
                {isLoading ? (
                    <div className="mt-6 space-y-4">
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                    </div>
                ) : (
                    <div className="mt-6 space-y-4 rounded-md border p-4">
                        {form.getValues('safetySettings').map((setting, index) => (
                            <FormField
                                key={setting.category}
                                control={form.control}
                                name={`safetySettings.${index}.threshold`}
                                render={({ field }) => (
                                    <FormItem className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                                        <FormLabel className="font-semibold capitalize">{getCategoryLabel(setting.category)}</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="w-full sm:w-[240px]">
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {THRESHOLDS.map(t => (
                                                    <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </FormItem>
                                )}
                            />
                        ))}
                    </div>
                )}
                </CardContent>
            </Card>
             <div className="flex justify-end">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save All Settings
                </Button>
            </div>
        </form>
       </Form>
    </div>
  );
}
