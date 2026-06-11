
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { doc, updateDoc } from '@/lib/firebase-stubs';
// Import storage operations from local firebase-stubs to support offline local storage
import { ref, uploadBytes, getDownloadURL } from '@/lib/firebase-stubs';

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
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { db, auth, storage } from "@/lib/firebase";
import type { MockUser } from '@/lib/schema';
import { Save, Upload } from 'lucide-react';
import { useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


const formSchema = z.object({
  name: z.string().min(1, { message: 'Full name is required.' }),
  phone: z.string().min(1, 'Phone number is required.'),
  nextOfKin: z.string().optional(),
  profilePicture: z.any().optional(),
});

type PersonalInfoFormValues = z.infer<typeof formSchema>;

export function PersonalInfoForm({
  user,
  onUpdate,
}: {
  user: MockUser;
  onUpdate: () => void;
}) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(user.personalInfo?.profilePicture || null);
  const fileInputRef = useRef<HTMLInputElement>(null);


  const form = useForm<PersonalInfoFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user.name || '',
      phone: user.phone || '',
      nextOfKin: user.personalInfo?.nextOfKin || '',
    },
  });

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      form.setValue('profilePicture', event.target.files);
    }
  };

  async function onSubmit(values: PersonalInfoFormValues) {
    setIsSubmitting(true);
    try {
      const userRef = doc(db, 'users', user.id);
      let downloadURL = user.personalInfo?.profilePicture;

      // Check if a new file is selected
      const fileList = form.getValues('profilePicture') as FileList | undefined;
      if (fileList && fileList.length > 0) {
        const file = fileList[0];
        const storageRef = ref(storage, `profile-pictures/${user.id}/${file.name}`);
        const uploadResult = await uploadBytes(storageRef, file);
        downloadURL = await getDownloadURL(uploadResult.ref);
      }

      await updateDoc(userRef, {
        name: values.name,
        phone: values.phone,
        'personalInfo.nextOfKin': values.nextOfKin,
        'personalInfo.profilePicture': downloadURL,
      });

      toast({
        title: 'Success',
        description: 'Your personal information has been updated.',
      });
      onUpdate();
    } catch (e: any) {
      console.error('Error updating personal info: ', e);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'There was a problem updating your details.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
        <div className="flex flex-col items-center gap-4">
            <Avatar className="h-24 w-24">
                <AvatarImage src={imagePreview || ''} />
                <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4"/>
                Change Picture
            </Button>
            <FormField
                control={form.control}
                name="profilePicture"
                render={({ field }) => (
                    <FormItem className="hidden">
                        <FormControl>
                             <Input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImageChange}
                                accept="image/png, image/jpeg, image/gif"
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>

        <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
            <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                    <Input placeholder="e.g. Amina Sani" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                    <Input placeholder="e.g. 08012345678" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
             <FormField
            control={form.control}
            name="nextOfKin"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Next of Kin</FormLabel>
                <FormControl>
                    <Input placeholder="e.g. Ibrahim Sani" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : <> <Save className="mr-2 h-4 w-4" /> Save Changes </>}
        </Button>
      </form>
    </Form>
  );
}
