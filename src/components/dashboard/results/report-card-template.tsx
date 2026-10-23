
'use client';

import { useState, useTransition } from 'react';
import type { ReportCard, SchoolInfo } from '@/lib/schema';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles } from 'lucide-react';
import { aiEngine } from '@/ai';
import { useToast } from '@/hooks/use-toast';
import { useRole } from '@/context/role-context';

interface ReportCardTemplateProps {
  reportCard: ReportCard;
  schoolInfo: SchoolInfo | null;
}

export function ReportCardTemplate({ reportCard, schoolInfo }: ReportCardTemplateProps) {
  const [teacherComment, setTeacherComment] = useState(reportCard.teacherComment || "Shows great potential and is encouraged to participate more in class discussions.");
  const [isGeneratingComment, startCommentGeneration] = useTransition();
  const { toast } = useToast();
  const { role } = useRole();
  
  const canEdit = role === 'Admin' || role === 'Teacher' || role === 'ExamOfficer';

  const gradeColor = (grade: string) => {
    if (['A'].includes(grade)) return 'text-green-600';
    if (['B'].includes(grade)) return 'text-blue-600';
    if (['C'].includes(grade)) return 'text-yellow-600';
    if (['D', 'E'].includes(grade)) return 'text-orange-600';
    return 'text-red-600';
  };

  const handleGenerateComment = () => {
    startCommentGeneration(async () => {
        try {
            const grades = reportCard.subjects.map(s => ({
                name: s.name,
                score: s.totalScore,
                grade: s.grade,
            }));
            const result = await aiEngine.academic.generateComment({
                studentName: reportCard.studentName.split(' ')[0],
                grades,
            });
            if (result.comment) {
                setTeacherComment(result.comment);
            }
        } catch (error) {
            console.error(error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to generate AI comment.',
            });
        }
    });
  }

  return (
        <div className="bg-white text-black font-serif">
            <style jsx global>{`
                @media print {
                  .printable-header-report, .printable-footer-report {
                    position: fixed;
                    width: 100%;
                    left: 0;
                    padding-left: 2rem;
                    padding-right: 2rem;
                    background-color: white;
                  }
                  .printable-header-report {
                    top: 0;
                  }
                  .printable-footer-report {
                    bottom: 0;
                  }
                  .printable-main-report {
                    padding-top: 150px; 
                    padding-bottom: 50px;
                  }
                }
            `}</style>
            <header className="printable-header-report p-8 text-center border-b-4 border-black pb-4">
                {schoolInfo?.logoUrl && (
                  <div className="flex justify-center mb-4">
                    <Image src={schoolInfo.logoUrl} alt="School Logo" width={250} height={60} className="h-20 w-auto object-contain" />
                  </div>
                )}
                <h1 className="text-4xl font-bold" style={{color: "hsl(var(--primary))"}}>{schoolInfo?.name || 'School Name'}</h1>
                <p className="text-sm text-gray-600 mt-1">{schoolInfo?.address}</p>
                 <p className="text-sm text-gray-600 mt-1">Phone: {schoolInfo?.phone} | Email: {schoolInfo?.email}</p>
            </header>
            <main className="printable-main-report p-8">
                <div className="text-center py-2">
                    <h3 className="text-xl font-bold uppercase tracking-wider text-black">Student Report Card</h3>
                    <p className="font-medium text-gray-800">{reportCard.term} - {reportCard.session} Session</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-4 text-sm pt-4">
                    <div><strong className="text-gray-600">Student Name:</strong> {reportCard.studentName}</div>
                    <div><strong className="text-gray-600">Student ID:</strong> {reportCard.studentId}</div>
                    <div><strong className="text-gray-600">Class:</strong> {reportCard.class}</div>
                </div>
           
                <div className="overflow-x-auto mt-6">
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead className="font-bold text-black">Subject</TableHead>
                        <TableHead className="text-center font-bold text-black">CA (40%)</TableHead>
                        <TableHead className="text-center font-bold text-black">Exam (60%)</TableHead>
                        <TableHead className="text-center font-bold text-black">Total (100%)</TableHead>
                        <TableHead className="text-center font-bold text-black">Grade</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {reportCard.subjects.map((subject, index) => (
                        <TableRow key={index} className="hover:bg-gray-50">
                            <TableCell className="font-medium text-black">{subject.name}</TableCell>
                            <TableCell className="text-center text-black">{subject.caScore}</TableCell>
                            <TableCell className="text-center text-black">{subject.examScore}</TableCell>
                            <TableCell className="text-center font-semibold text-black">{subject.totalScore}</TableCell>
                            <TableCell className={`text-center font-bold ${gradeColor(subject.grade)}`}>
                            {subject.grade}
                            </TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                    </Table>
                </div>

                <Separator className="my-6 bg-gray-200" />

                <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-6 text-center">
                    <div className="rounded-lg bg-gray-100 p-4">
                        <p className="text-sm text-gray-600">Total Marks</p>
                        <p className="text-2xl font-bold text-black">{reportCard.totalMarks} / {reportCard.subjects.length * 100}</p>
                    </div>
                    <div className="rounded-lg bg-gray-100 p-4">
                        <p className="text-sm text-gray-600">Overall Average</p>
                        <p className={`text-2xl font-bold ${gradeColor(reportCard.overallGrade)}`}>{reportCard.average.toFixed(1)}%</p>
                    </div>
                    <div className="rounded-lg bg-gray-100 p-4">
                        <p className="text-sm text-gray-600">Class Rank</p>
                        <p className="text-2xl font-bold text-black">{reportCard.classRank}</p>
                    </div>
                </div>
                
                <div className="mt-8 space-y-4 text-black">
                    <div>
                        <div className="flex justify-between items-center mb-1">
                             <h4 className="font-semibold">Teacher's Comment:</h4>
                             {canEdit && (
                                <Button onClick={handleGenerateComment} disabled={isGeneratingComment} size="sm" variant="outline" className="text-black print:hidden">
                                     {isGeneratingComment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                    Generate with AI
                                </Button>
                             )}
                        </div>
                        <p className="text-sm border-b border-gray-300 pb-2">{teacherComment}</p>
                    </div>
                    <div>
                        <h4 className="font-semibold">Principal's Comment:</h4>
                        <p className="text-sm border-b border-gray-300 pb-2">{reportCard.principalComment || "A satisfactory performance. Keep up the good work."}</p>
                    </div>
                </div>

                <div className="mt-12 flex justify-between items-end text-sm text-black">
                    <div className="text-center">
                        <div className="border-t-2 border-dashed border-gray-400 w-32 mx-auto mb-1"></div>
                        <p>Teacher's Signature</p>
                    </div>
                    <div className="text-center">
                        <div className="border-t-2 border-dashed border-gray-400 w-32 mx-auto mb-1"></div>
                        <p>Principal's Signature</p>
                    </div>
                </div>
            </main>
        </div>
  );
}
