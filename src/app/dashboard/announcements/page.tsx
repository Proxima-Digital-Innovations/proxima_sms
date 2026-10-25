'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from '@/components/ui/skeleton';
import { format, formatDistanceToNow } from 'date-fns';
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
import { useRole } from '@/context/role-context';
import { useToast } from '@/hooks/use-toast';
import { deleteAnnouncement, getAnnouncements } from '@/actions/announcement-actions';
import type { Announcement } from '@/lib/schema';
import {
  Megaphone,
  PlusCircle,
  Search,
  Calendar,
  Clock,
  User,
  ArrowRight,
  Printer,
  AlertCircle,
  BookOpen,
  CreditCard,
  Trophy,
  ShieldCheck,
  Award,
  MoreHorizontal,
  Edit,
  Trash2,
  FileText,
  Filter
} from 'lucide-react';

interface CategoryConfig {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeClass: string;
}

const CATEGORIES: Record<string, CategoryConfig> = {
  academic: {
    name: 'Academic & Exams',
    icon: BookOpen,
    badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  },
  finance: {
    name: 'Bursary & Fees',
    icon: CreditCard,
    badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
  sports: {
    name: 'Sports & Extra-Curricular',
    icon: Trophy,
    badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
  security: {
    name: 'Campus Safety & BAS',
    icon: ShieldCheck,
    badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  },
  tahfeez: {
    name: 'Tahfeez & Morals',
    icon: Award,
    badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  },
  general: {
    name: 'General Notice',
    icon: Megaphone,
    badgeClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
  },
};

function getCategoryForAnnouncement(title: string, content: string): string {
  const text = `${title} ${content}`.toLowerCase();
  if (text.includes('tuition') || text.includes('fee') || text.includes('bursar') || text.includes('wallet') || text.includes('invoice') || text.includes('levy')) {
    return 'finance';
  }
  if (text.includes('mid-term') || text.includes('continuous assessment') || text.includes('exam') || text.includes('grade') || text.includes('resume') || text.includes('pta')) {
    return 'academic';
  }
  if (text.includes('sports') || text.includes('athletic') || text.includes('relay') || text.includes('inter-house') || text.includes('festival')) {
    return 'sports';
  }
  if (text.includes('biometric') || text.includes('kiosk') || text.includes('security') || text.includes('gate') || text.includes('visitor') || text.includes('safety')) {
    return 'security';
  }
  if (text.includes('tahfeez') || text.includes('quran') || text.includes('tajweed') || text.includes('huffadh') || text.includes('memorization')) {
    return 'tahfeez';
  }
  return 'general';
}

function getPriorityForAnnouncement(title: string, content: string): { label: string; isUrgent: boolean } {
  const text = `${title} ${content}`.toLowerCase();
  if (text.includes('clearance') || text.includes('deadline') || text.includes('reminder') || text.includes('break')) {
    return { label: 'Important Notice', isUrgent: true };
  }
  return { label: 'General Bulletin', isUrgent: false };
}

export default function AnnouncementsPage() {
  const { role } = useRole();
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = usePersistentState('announcement-form-open', false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  const normalizedRole = (role || '').toUpperCase();
  const canManage = normalizedRole === 'ADMIN' || normalizedRole === 'SUPER_ADMIN' || normalizedRole === 'SLT';

  const fetchAnnouncements = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getAnnouncements();
      if (res.success && res.announcements) {
        setAnnouncements(res.announcements as any[]);
      }
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
      if (result && 'error' in result) throw new Error(result.error);
      toast({ title: 'Success', description: 'Announcement deleted successfully.' });
      fetchAnnouncements();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  // Filter and search
  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((ann) => {
      const category = getCategoryForAnnouncement(ann.title, ann.content);
      const priority = getPriorityForAnnouncement(ann.title, ann.content);

      if (selectedFilter === 'urgent' && !priority.isUrgent) return false;
      if (selectedFilter !== 'all' && selectedFilter !== 'urgent' && category !== selectedFilter) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = ann.title.toLowerCase().includes(query);
        const matchesContent = ann.content.toLowerCase().includes(query);
        const matchesAuthor = (ann.authorName || '').toLowerCase().includes(query);
        return matchesTitle || matchesContent || matchesAuthor;
      }
      return true;
    });
  }, [announcements, selectedFilter, searchQuery]);

  const featured = filteredAnnouncements.length > 0 ? filteredAnnouncements[0] : null;
  const remainingList = filteredAnnouncements.slice(1);

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border p-5 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-headline text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
              Announcements & Circulars
            </h1>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold px-2.5 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1.5 inline-block" />
              Official Broadcasts
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Important notices, academic schedules, administrative circulars, and institutional updates.
          </p>
        </div>

        {canManage && (
          <Dialog open={isFormOpen} onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) setEditingAnnouncement(undefined);
          }}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-9 px-4 rounded-xl shadow-sm gap-1.5">
                <PlusCircle className="w-4 h-4" />
                Publish Announcement
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingAnnouncement ? 'Edit' : 'Create New'} Announcement</DialogTitle>
              </DialogHeader>
              <AnnouncementForm
                initialData={editingAnnouncement}
                onFormSubmit={handleFormSubmit}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* 2. Top Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-2xl border-border bg-card p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Published Circulars</div>
            <div className="text-2xl font-extrabold text-foreground font-mono">
              {isLoading ? <Skeleton className="h-8 w-16" /> : announcements.length}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Megaphone className="w-5 h-5" />
          </div>
        </Card>

        <Card className="rounded-2xl border-border bg-card p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Action Required</div>
            <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-mono">
              {isLoading ? <Skeleton className="h-8 w-16" /> : '2 Notices'}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <AlertCircle className="w-5 h-5" />
          </div>
        </Card>

        <Card className="rounded-2xl border-border bg-card p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Academic Cycle</div>
            <div className="text-lg font-bold text-foreground truncate max-w-[180px]">
              First Term 2024/2025
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* 3. Search and Category Filter Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search circulars, topics, or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 rounded-xl bg-card border-border text-xs"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 flex-wrap">
          <Button
            variant={selectedFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedFilter('all')}
            className="h-8 text-xs rounded-xl font-semibold"
          >
            All Notices
          </Button>
          <Button
            variant={selectedFilter === 'urgent' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedFilter('urgent')}
            className="h-8 text-xs rounded-xl font-semibold gap-1.5"
          >
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
            Important
          </Button>
          <Button
            variant={selectedFilter === 'academic' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedFilter('academic')}
            className="h-8 text-xs rounded-xl font-semibold"
          >
            Academic
          </Button>
          <Button
            variant={selectedFilter === 'finance' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedFilter('finance')}
            className="h-8 text-xs rounded-xl font-semibold"
          >
            Bursary & Fees
          </Button>
          <Button
            variant={selectedFilter === 'sports' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedFilter('sports')}
            className="h-8 text-xs rounded-xl font-semibold"
          >
            Sports
          </Button>
          <Button
            variant={selectedFilter === 'security' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedFilter('security')}
            className="h-8 text-xs rounded-xl font-semibold"
          >
            Safety & BAS
          </Button>
          <Button
            variant={selectedFilter === 'tahfeez' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedFilter('tahfeez')}
            className="h-8 text-xs rounded-xl font-semibold"
          >
            Tahfeez
          </Button>
        </div>
      </div>

      {/* 4. Announcements List */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-64 rounded-3xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
          </div>
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <Card className="rounded-3xl border border-dashed border-border p-12 text-center bg-card">
          <div className="w-16 h-16 rounded-2xl bg-muted/50 text-muted-foreground flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 opacity-40" />
          </div>
          <h3 className="font-bold text-base text-foreground">No matching circulars found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No announcements match "${searchQuery}". Try searching for another term.`
              : 'There are no announcements in this category right now.'}
          </p>
          {(searchQuery || selectedFilter !== 'all') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setSelectedFilter('all');
              }}
              className="mt-4 text-xs rounded-xl"
            >
              Clear Filters
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-6">
          
          {/* FEATURED ANNOUNCEMENT (TOP ITEM) */}
          {featured && (
            <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-card via-card to-primary/5 p-6 sm:p-7 shadow-md">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="bg-primary text-primary-foreground text-xs font-semibold px-2.5 py-0.5 gap-1.5 inline-flex items-center">
                      <Megaphone className="w-3.5 h-3.5" />
                      Featured Circular
                    </Badge>
                    {(() => {
                      const catKey = getCategoryForAnnouncement(featured.title, featured.content);
                      const cat = CATEGORIES[catKey] || CATEGORIES.general;
                      const Icon = cat.icon;
                      return (
                        <Badge variant="outline" className={`text-xs font-medium gap-1 ${cat.badgeClass}`}>
                          <Icon className="w-3 h-3" />
                          {cat.name}
                        </Badge>
                      );
                    })()}
                    {getPriorityForAnnouncement(featured.title, featured.content).isUrgent && (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs">
                        Action Required
                      </Badge>
                    )}
                  </div>

                  <Link href={`/dashboard/announcements/${featured.id}`}>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-foreground hover:text-primary transition-colors tracking-tight mt-1">
                      {featured.title}
                    </h2>
                  </Link>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap pt-0.5">
                    <span className="flex items-center gap-1 font-medium text-foreground">
                      <User className="w-3.5 h-3.5 text-primary" />
                      {featured.authorName || 'School Administration'}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {featured.createdAt?.seconds
                        ? format(new Date(featured.createdAt.seconds * 1000), 'PPP')
                        : 'Recent'}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {featured.createdAt?.seconds
                        ? formatDistanceToNow(new Date(featured.createdAt.seconds * 1000), { addSuffix: true })
                        : 'Just now'}
                    </span>
                  </div>
                </div>

                {canManage && (
                  <AlertDialog>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(featured)}>
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this announcement?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action will permanently remove this circular from all student, parent, and staff portals.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(featured.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>

              {/* Formatted Content Preview */}
              <div className="text-sm text-foreground/90 leading-relaxed space-y-2 max-w-4xl line-clamp-4">
                {featured.content.split('\n').filter(Boolean).slice(0, 3).map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>

              <div className="pt-5 mt-5 border-t border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold h-9 px-4 rounded-xl shadow-sm gap-1.5 w-full sm:w-auto">
                  <Link href={`/dashboard/announcements/${featured.id}`}>
                    <FileText className="w-3.5 h-3.5" />
                    Read Full Official Circular & Letterhead
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Link>
                </Button>

                <Button asChild variant="outline" size="sm" className="text-xs h-9 px-3 rounded-xl gap-1.5">
                  <Link href={`/dashboard/announcements/${featured.id}`}>
                    <Printer className="w-3.5 h-3.5" />
                    Print Memo PDF
                  </Link>
                </Button>
              </div>
            </div>
          )}

          {/* REMAINING ANNOUNCEMENTS GRID */}
          {remainingList.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {remainingList.map((ann) => {
                const catKey = getCategoryForAnnouncement(ann.title, ann.content);
                const cat = CATEGORIES[catKey] || CATEGORIES.general;
                const Icon = cat.icon;
                const priority = getPriorityForAnnouncement(ann.title, ann.content);

                return (
                  <Card
                    key={ann.id}
                    className="rounded-2xl border-border bg-card shadow-sm hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="outline" className={`text-[11px] font-medium gap-1 ${cat.badgeClass}`}>
                            <Icon className="w-3 h-3" />
                            {cat.name}
                          </Badge>
                          {priority.isUrgent && (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px]">
                              Important
                            </Badge>
                          )}
                        </div>

                        {canManage && (
                          <AlertDialog>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground -mr-2 -mt-1">
                                  <MoreHorizontal className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(ann)}>
                                  <Edit className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem className="text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete this announcement?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(ann.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>

                      <Link href={`/dashboard/announcements/${ann.id}`}>
                        <CardTitle className="text-base font-bold text-foreground hover:text-primary transition-colors leading-snug mt-2">
                          {ann.title}
                        </CardTitle>
                      </Link>

                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1">
                        <span className="font-medium text-foreground">{ann.authorName}</span>
                        <span>•</span>
                        <span>
                          {ann.createdAt?.seconds
                            ? formatDistanceToNow(new Date(ann.createdAt.seconds * 1000), { addSuffix: true })
                            : 'Recent'}
                        </span>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4 pt-0">
                      <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                        {ann.content}
                      </p>

                      <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> 2 min read
                        </span>

                        <Button asChild variant="ghost" size="sm" className="h-7 text-xs font-semibold text-primary hover:text-primary gap-1 px-2">
                          <Link href={`/dashboard/announcements/${ann.id}`}>
                            Read Circular <ArrowRight className="w-3 h-3" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

        </div>
      )}

    </div>
  );
}
