'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PlusCircle, Upload } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AddStudentForm } from './add-student-form';
import { BulkStudentUploadDialog } from './bulk-student-upload-dialog';
import Image from 'next/image';

export function StudentHeaderActions() {
  const router = useRouter();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);

  const handleRefresh = () => {
    router.refresh();
  };

  return (
    <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0">
      {/* Bulk Upload Dialog */}
      <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            className="bg-background border-border hover:bg-muted hover:text-foreground transition-colors rounded-xl h-10 px-3.5 text-xs sm:text-sm font-medium"
          >
            <Upload className="mr-2 h-4 w-4" />
            Bulk Upload
          </Button>
        </DialogTrigger>
        <BulkStudentUploadDialog 
          onUploadComplete={() => {
            setIsBulkOpen(false);
            handleRefresh();
          }} 
        />
      </Dialog>

      {/* Enroll Student Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogTrigger asChild>
          <Button className="bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-500/20 transition-all rounded-xl h-10 px-4 text-xs sm:text-sm font-medium">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Student
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl border-border bg-background text-foreground max-h-[90vh] overflow-y-auto w-[95vw] p-4 sm:p-6">
          <DialogHeader>
            <div className="mx-auto mb-4">
              <Image
                src="/school-logo.png"
                alt="School OS Logo"
                width={250}
                height={60}
                className="hidden dark:block"
              />
            </div>
            <DialogTitle className="text-foreground text-xl">Enroll New Student</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs sm:text-sm">
              Fill in the form below to add a new student and generate their guardian accounts.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <AddStudentForm />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
