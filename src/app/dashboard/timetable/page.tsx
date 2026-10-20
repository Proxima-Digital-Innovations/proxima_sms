'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Calendar as CalendarIcon, Clock, BookOpen, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function TimetablePage() {
    return (
        <div className="min-h-screen bg-background pb-12 -mt-6 -mx-6">
            
            {/* Top Header */}
            <div className="flex justify-between items-center px-8 py-5 bg-background backdrop-blur-md border-b border-border sticky top-0 z-20 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-violet-600/20 border border-violet-500/30 rounded-xl shadow-[0_0_15px_rgba(139,92,246,0.15)]">
                        <CalendarIcon className="text-violet-400 w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-foreground tracking-tight">Exam Timetable</h1>
                        <p className="text-xs text-muted-foreground font-medium">Manage and view the examination schedule</p>
                    </div>
                </div>
                <div>
                    <Button disabled className="bg-muted text-muted-foreground border-border hover:bg-muted cursor-not-allowed">
                        <PlusCircle className="mr-2 h-4 w-4" /> Schedule New Exam
                    </Button>
                </div>
            </div>

            <div className="px-8 py-10 max-w-5xl mx-auto">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ duration: 0.4 }}
                >
                    <Card className="bg-background border-border shadow-2xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-50" />
                        
                        <CardHeader className="relative z-10 border-b border-border pb-8">
                            <div className="flex items-start justify-between">
                                <div>
                                    <CardTitle className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-3">
                                        Exam Schedule Module
                                        <span className="text-[10px] uppercase tracking-widest font-black bg-violet-600/20 text-violet-400 px-2 py-1 rounded-full border border-violet-500/30">
                                            In Development
                                        </span>
                                    </CardTitle>
                                    <CardDescription className="text-muted-foreground mt-2 max-w-2xl text-base leading-relaxed">
                                       This module allows the Exam Officer to create and publish the official timetable for all major examinations. The schedule will be displayed on an interactive calendar, providing a clear overview for staff, students, and parents.
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="relative z-10 pt-12 pb-16">
                            <div className="flex flex-col items-center justify-center text-center space-y-6">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-violet-500 blur-3xl opacity-20 rounded-full" />
                                    <div className="relative bg-background p-6 rounded-3xl border border-border shadow-xl inline-block">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="w-16 h-16 bg-background rounded-2xl flex items-center justify-center border border-border">
                                                <CalendarIcon className="w-8 h-8 text-muted-foreground" />
                                            </div>
                                            <div className="w-16 h-16 bg-violet-950 rounded-2xl flex items-center justify-center border border-violet-900">
                                                <Clock className="w-8 h-8 text-violet-400" />
                                            </div>
                                            <div className="w-16 h-16 bg-background rounded-2xl flex items-center justify-center border border-border">
                                                <BookOpen className="w-8 h-8 text-muted-foreground" />
                                            </div>
                                            <div className="w-16 h-16 bg-background rounded-2xl flex items-center justify-center border border-border">
                                                <AlertCircle className="w-8 h-8 text-muted-foreground" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="max-w-md">
                                    <h3 className="text-xl font-bold text-foreground mb-2">Coming Soon</h3>
                                    <p className="text-muted-foreground text-sm">
                                        The interactive exam calendar is currently being built. Soon you'll be able to drag-and-drop exams, set invigilators, and avoid scheduling conflicts automatically.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
}
