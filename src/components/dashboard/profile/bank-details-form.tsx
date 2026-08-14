
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { updateProfileInfo } from '@/actions/profile-actions';
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
import { useToast } from '@/hooks/use-toast';
import type { MockUser } from '@/lib/schema';
import { Save } from 'lucide-react';
import { useState } from 'react';
import { useRole } from '@/context/role-context';
import { Combobox } from '@/components/ui/combobox';

const NIGERIAN_BANKS = [
  "Access Bank", "Citibank", "Ecobank Nigeria", "Fidelity Bank Nigeria", "First Bank of Nigeria",
  "First City Monument Bank", "Globus Bank", "Guaranty Trust Bank", "Heritage Bank Plc", "Keystone Bank Limited",
  "Parallex Bank", "Polaris Bank", "PremiumTrust Bank", "Providus Bank Plc", "Stanbic IBTC Bank Nigeria Limited",
  "Standard Chartered", "Sterling Bank", "SunTrust Bank Nigeria Limited", "Titan Trust Bank Limited", "Union Bank of Nigeria",
  "United Bank for Africa", "Unity Bank Plc", "Wema Bank", "Zenith Bank"
].map(bank => ({ value: bank.toLowerCase(), label: bank }));


const formSchema = z.object({
  salaryAmount: z.string().optional(),
  bankName: z.string().min(1, 'Please select a bank.'),
  accountNumber: z.string().min(10, 'Account number must be 10 digits.').max(10, 'Account number must be 10 digits.'),
  accountName: z.string().min(1, 'Account name is required.'),
});

type BankDetailsFormValues = z.infer<typeof formSchema>;

export function BankDetailsForm({
  user,
  onUpdate,
}: {
  user: MockUser;
  onUpdate: () => void;
}) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { role: currentUserRole } = useRole();
  const canEditSalary = currentUserRole === 'Admin' || currentUserRole === 'Accountant';

  const form = useForm<BankDetailsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      salaryAmount: user.salary?.amount.toString() || '0',
      bankName: user.salary?.bankName?.toLowerCase() || '',
      accountNumber: user.salary?.accountNumber || '',
      accountName: user.salary?.accountName || '',
    },
  });

  async function onSubmit(values: BankDetailsFormValues) {
    setIsSubmitting(true);
    try {
      const bankLabel = NIGERIAN_BANKS.find(b => b.value === values.bankName)?.label || values.bankName;

      const updateData: any = {
        bankName: bankLabel,
        accountNumber: values.accountNumber,
        accountName: values.accountName,
      };

      if (canEditSalary && values.salaryAmount) {
        updateData.salaryAmount = Number(values.salaryAmount);
      }

      const result = await updateProfileInfo(user.id, updateData);
      if (!result.success) throw new Error(result.error);

      toast({
        title: 'Success',
        description: 'Bank and salary details have been updated.',
      });
      onUpdate();
    } catch (e: any) {
      console.error('Error updating bank details: ', e);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'There was a problem updating the details.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="salaryAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Salary (NGN)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="e.g. 150000"
                    {...field}
                    disabled={!canEditSalary}
                  />
                </FormControl>
                {!canEditSalary && <FormMessage>Only an administrator can change the salary amount.</FormMessage>}
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="bankName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bank Name</FormLabel>
                <FormControl>
                  <Combobox
                    options={NIGERIAN_BANKS}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select a bank"
                    searchPlaceholder="Search banks..."
                    notFoundText="No bank found."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="accountNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account Number</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g. 0123456789" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="accountName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Amina Sani" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
            'Saving...'
        ) : (
            <>
            <Save className="mr-2 h-4 w-4" /> Save Changes
            </>
        )}
        </Button>
      </form>
    </Form>
  );
}
