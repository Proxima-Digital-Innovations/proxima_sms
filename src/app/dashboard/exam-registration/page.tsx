'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Ticket } from "lucide-react";

export default function ExamRegistrationPage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="font-headline text-3xl font-bold">Exam Registration</h1>
                <p className="text-muted-foreground">
                    Manage student registrations for upcoming examinations.
                </p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Student Exam Entry</CardTitle>
                    <CardDescription>
                       This module enables the Exam Officer to formally register students for internal and external examinations. It will support managing student entries, assigning exam numbers, and noting any special arrangements (e.g., extra time). This ensures a formal and organized process for all major assessments.
                       <br /><br />
                        <strong className="text-primary">This feature is currently in development and will be available once the project is approved.</strong>
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
                         <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                             <Ticket className="h-8 w-8 text-primary" />
                         </div>
                        <h3 className="text-lg font-semibold">Exam Registration is Coming Soon</h3>
                        <p className="text-sm text-muted-foreground mt-2">
                           An interface to register students for exams will be available here.
                        </p>
                        <Button disabled className="mt-4">
                            Register Student
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
