
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Rss, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { useRole } from '@/context/role-context';
import { dbService } from '@/lib/dbService';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AnnouncementForm } from '@/components/dashboard/announcements/announcement-form';
import usePersistentState from '@/hooks/use-persistent-state';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { deleteAnnouncement } from '@/actions/announcement-actions';
import type { Announcement } from '@/lib/schema';


export default function AnnouncementsPage() {
    const { role } = useRole();
    const { toast } = useToast();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = usePersistentState('announcement-form-open', false);
    const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | undefined>(undefined);

    const canManage = role === 'Admin' || role === 'SLT';

    const fetchAnnouncements = useCallback(async () => {
        setIsLoading(true);
        try {
            const fetchedAnnouncements = await dbService.getDocs<Announcement>('announcements', [{ type: 'orderBy', fieldPath: 'createdAt', direction: 'desc' }]);
            setAnnouncements(fetchedAnnouncements);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAnnouncements();
    }, [fetchAnnouncements]);

    const handleFormSubmit = (success: boolean) => {
        setIsFormOpen(false);
        setEditingAnnouncement(undefined);
        if (success) {
            fetchAnnouncements();
        }
    };
    
    const handleEdit = (ann: Announcement) => {
        setEditingAnnouncement(ann);
        setIsFormOpen(true);
    };

    const handleDelete = async (id: string) => {
        try {
            const result = await deleteAnnouncement(id);
            // Safely verify if there's an error in the return payload
            if (result && 'error' in result) throw new Error(result.error);
            toast({ title: 'Success', description: 'Announcement deleted successfully.' });
            fetchAnnouncements();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };


    return (
        <div className="space-y-8">
            <div>
                <h1 className="font-headline text-3xl font-bold">Announcements</h1>
                <p className="text-muted-foreground">
                    View important updates and news from the school.
                </p>
            </div>
            
             <Dialog open={isFormOpen} onOpenChange={(open) => {
                 setIsFormOpen(open);
                 if (!open) setEditingAnnouncement(undefined);
             }}>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>School-wide Announcements</CardTitle>
                            <CardDescription>
                                Official announcements from the school administration.
                            </CardDescription>
                        </div>
                        {canManage && (
                            <DialogTrigger asChild>
                                <Button>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Create Announcement
                                </Button>
                            </DialogTrigger>
                        )}
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-64 w-full" />
                        ) : announcements.length === 0 ? (
                            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
                                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                                    <Rss className="h-8 w-8 text-primary" />
                                </div>
                                <h3 className="text-lg font-semibold">No Announcements Yet</h3>
                                <p className="text-sm text-muted-foreground mt-2">
                                    Check back later for important updates.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {announcements.map((ann) => (
                                     <Card key={ann.id} className="shadow-none border hover:shadow-md transition-shadow">
                                        <CardHeader>
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <Link href={`/dashboard/announcements/${ann.id}`} className="hover:underline">
                                                        <CardTitle>{ann.title}</CardTitle>
                                                    </Link>
                                                    <CardDescription>
                                                        Posted by {ann.authorName} on {format(new Date(ann.createdAt.seconds * 1000), 'PPP')}
                                                    </CardDescription>
                                                </div>
                                                {canManage && (
                                                     <AlertDialog>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent>
                                                                <DropdownMenuItem onClick={() => handleEdit(ann)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                                                                <AlertDialogTrigger asChild>
                                                                    <DropdownMenuItem className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                                                                </AlertDialogTrigger>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    This action cannot be undone. This will permanently delete this announcement.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDelete(ann.id)}>Delete</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                     </AlertDialog>
                                                )}
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm whitespace-pre-wrap line-clamp-3">{ann.content}</p>
                                        </CardContent>
                                     </Card>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                 <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingAnnouncement ? 'Edit' : 'Create New'} Announcement</DialogTitle>
                    </DialogHeader>
                    <AnnouncementForm
                        initialData={editingAnnouncement}
                        onFormSubmit={handleFormSubmit}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}
