
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, notFound } from 'next/navigation';
import { collection, query, where, getDocs, orderBy } from '@/lib/firebase-stubs';
import { db, auth, storage } from "@/lib/firebase";
import type { ReportCard, Student } from '@/lib/schema';
import { Button } from '@/components/ui/button';
import { Printer, Loader2, AlertCircle, Eye } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ReportCardTemplate } from '@/components/dashboard/results/report-card-template';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function ViewClassResultsPage() {
  const params = useParams();
  const { classId } = params;
  const className = decodeURIComponent(classId as string);

  const [reportCards, setReportCards] = useState<ReportCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const reportsQuery = query(
        collection(db, 'reportCards'),
        where('class', '==', className)
      );

      const querySnapshot = await getDocs(reportsQuery);
      if (querySnapshot.empty) {
        setError(
          `No report cards found for ${className}. Please generate the results first.`
        );
      } else {
        const reports = querySnapshot.docs.map(
          (doc: any) => ({ id: doc.id, ...doc.data() } as ReportCard)
        );
        reports.sort((a: any, b: any) => a.classRank - b.classRank);
        setReportCards(reports);
      }
    } catch (e: any) {
      console.error('Error fetching report cards:', e);
      setError(e.message || 'An error occurred while fetching reports.');
    } finally {
      setIsLoading(false);
    }
  }, [className]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-8 w-64" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl font-bold">
          Results for {className}
        </h1>
        <p className="text-muted-foreground">
          Displaying {reportCards.length} generated report cards for the{' '}
          {reportCards[0]?.term}, {reportCards[0]?.session} session.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Class Summary</CardTitle>
          <CardDescription>
            Click on a student to view their individual report card.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Student Name</TableHead>
                <TableHead>Average</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportCards.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-bold">{report.classRank}</TableCell>
                  <TableCell>{report.studentName}</TableCell>
                  <TableCell>{report.average.toFixed(1)}%</TableCell>
                  <TableCell>
                    <Badge>{report.overallGrade}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/dashboard/results/report/${report.id}`}>
                        <Eye className="mr-2 h-4 w-4" /> View Report
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
