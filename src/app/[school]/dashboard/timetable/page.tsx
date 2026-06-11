
'use client';

import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

export default function TimetablePage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="font-headline text-3xl font-bold">Exam Timetable</h1>
                <p className="text-muted-foreground">
                    Manage and view the examination schedule.
                </p>
            </div>
            <Card>
                <CardHeader className="flex-row items-center justify-between">
                    <div>
                        <CardTitle>Exam Schedule</CardTitle>
                        <CardDescription>
                           This module allows the Exam Officer to create and publish the official timetable for all major examinations. The schedule will be displayed on an interactive calendar, providing a clear overview for staff, students, and parents.
                        </CardDescription>
                    </div>
                     <Button disabled>
                        <PlusCircle className="mr-2 h-4 w-4" /> Schedule New Exam
                    </Button>
                </CardHeader>
                <CardContent>
                     <p className="text-sm text-center py-10 text-muted-foreground">The interactive exam calendar will be displayed here.</p>
                    <Calendar
                        mode="multiple"
                        className="rounded-md border"
                        disabled
                    />
                </CardContent>
            </Card>
        </div>
    );
}
