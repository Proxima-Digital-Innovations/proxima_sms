
'use client';

import { useForm, useWatch } from 'react-hook-form';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { saveExpense } from '@/actions/expense-actions';
import { useState, useTransition } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import type { Expense } from '@/lib/schema';
import { DatePicker } from '@/components/ui/date-picker';
import { useAcademicData } from '@/hooks/use-academic-data';
import { useRole } from '@/context/role-context';
import { aiEngine } from '@/ai';

const EXPENSE_CATEGORIES = ['Utilities', 'Salaries', 'Maintenance', 'Supplies', 'Marketing', 'Capital Expenditure', 'Miscellaneous'] as const;

const formSchema = z.object({
  id: z.string().optional(),
  category: z.enum(EXPENSE_CATEGORIES, { required_error: 'Please select a category.'}),
  description: z.string().min(3, 'Description must be at least 3 characters long.'),
  amount: z.coerce.number().positive('Amount must be a positive number.'),
  date: z.date({ required_error: 'Expense date is required.' }),
  department: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof formSchema>;

interface ExpenseFormProps {
  initialData?: Expense;
  onFormSubmit: (success: boolean) => void;
}

export function ExpenseForm({ initialData, onFormSubmit }: ExpenseFormProps) {
  const { toast } = useToast();
  const { departments } = useAcademicData();
  const { user } = useRole();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiCategorizing, startAiTransition] = useTransition();


  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        id: initialData?.id,
        category: initialData?.category,
        description: initialData?.description || '',
        amount: initialData?.amount || 0,
        date: initialData?.date ? new Date(initialData.date.seconds * 1000) : new Date(),
        department: initialData?.department || '',
    },
  });

  const descriptionValue = useWatch({ control: form.control, name: 'description' });

  const handleAiCategorize = () => {
    if (!descriptionValue) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please enter a description first.' });
        return;
    }
    startAiTransition(async () => {
        try {
            const result = await aiEngine.financial.categorize({ description: descriptionValue });
            if (result.category) {
                form.setValue('category', result.category, { shouldValidate: true });
                toast({ title: 'AI Suggestion', description: `Category set to "${result.category}".` });
            }
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: 'Error', description: 'AI categorization failed.' });
        }
    });
  };

  const onSubmit = async (values: ExpenseFormValues) => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
        return;
    }
    setIsSubmitting(true);
    try {
      const result: any = await saveExpense({ ...values, userId: user.uid });
      if (result.error) {
          Object.entries(result.error).forEach(([key, messages]) => {
              if (Array.isArray(messages)) {
                form.setError(key as keyof ExpenseFormValues, { message: messages.join(', ') });
              }
          });
          throw new Error('Validation failed.');
      }
      toast({ title: 'Success', description: 'Expense saved successfully.' });
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                    <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Amount (NGN)</FormLabel>
                    <FormControl>
                        <Input type="number" placeholder="e.g., 50000" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
        </div>

        <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
            <FormItem>
                <FormLabel>Description</FormLabel>
                <div className="flex items-center gap-2">
                    <FormControl>
                        <Input placeholder="e.g., Monthly electricity bill" {...field} />
                    </FormControl>
                    <Button type="button" variant="outline" size="icon" onClick={handleAiCategorize} disabled={isAiCategorizing || !descriptionValue}>
                         {isAiCategorizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    </Button>
                </div>
                 <p className="text-xs text-muted-foreground">Enter a description and click the AI suggestion button to categorize automatically.</p>
                <FormMessage />
            </FormItem>
            )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel className="mb-1">Expense Date</FormLabel>
                    <DatePicker value={field.value} onChange={field.onChange} />
                    <FormMessage />
                </FormItem>
            )} />
             <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Department (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                        <SelectTrigger><SelectValue placeholder="Assign to a department" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {departments.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
            />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="ghost" onClick={() => onFormSubmit(false)}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {initialData ? 'Save Changes' : 'Log Expense'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
