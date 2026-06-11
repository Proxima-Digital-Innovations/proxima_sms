
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAcademicData } from '@/hooks/use-academic-data';
import { useRouter } from 'next/navigation';

export default function ViewResultsPage() {
    const { classes, isLoading } = useAcademicData();
    const router = useRouter();

    const handleClassSelect = (className: string) => {
        router.push(`/dashboard/results/view/${className}`);
    }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-bold">View Student Results</h1>
        <p className="text-muted-foreground">
          Select a class to view the generated report cards.
        </p>
      </div>

      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Select a Class</CardTitle>
          <CardDescription>
            Choose the class for which you want to view report cards. Results must be generated first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select onValueChange={handleClassSelect} disabled={isLoading}>
            <SelectTrigger>
              <SelectValue placeholder={isLoading ? 'Loading classes...' : 'Select a class...'} />
            </SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.name}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    </div>
  );
}
