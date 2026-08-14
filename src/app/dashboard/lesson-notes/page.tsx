'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { createLessonNote, getLessonNotes, deleteLessonNote } from '@/actions/lesson-note-actions';
import { getAcademicData } from '@/actions/academic-data';
import { Plus, FileText, Upload, MoreVertical, Search, FileSignature, Loader2, BookOpen, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { motion, AnimatePresence } from 'framer-motion';

const REVIEW_ROLES = ['HOD', 'SLT', 'ADMIN', 'SUPER_ADMIN'];

export default function LessonPlansPage() {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;
  const userRole = (session?.user as any)?.role;
  const { toast } = useToast();
  const router = useRouter();

  const [notes, setNotes] = useState<any[]>([]);
  const [pendingNotes, setPendingNotes] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState({
    title: 'Untitled Document', subjectId: '', classId: '', termId: '',
  });

  const [searchQuery, setSearchQuery] = useState('');

  const isReviewer = REVIEW_ROLES.includes((userRole || '').toUpperCase());

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const [acadRes, myRes, pendingRes] = await Promise.all([
        getAcademicData(),
        getLessonNotes({ teacherId: userId }),
        isReviewer ? getLessonNotes({ status: 'SUBMITTED' }) : Promise.resolve({ success: true, notes: [] }),
      ]);
      setSubjects(acadRes.subjects || []);
      setClasses(acadRes.classes || []);
      setTerms(acadRes.terms || []);
      if (myRes.success) setNotes(myRes.notes || []);
      if (pendingRes.success) setPendingNotes((pendingRes.notes || []).filter((n: any) => n.teacherId !== userId));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.title || !form.subjectId || !form.classId || !form.termId) {
      toast({ variant: 'destructive', title: 'Missing Fields', description: 'Please fill in title, subject, class, and term.' });
      return;
    }
    setIsSaving(true);
    try {
      const res = await createLessonNote({
        title: form.title, subjectId: form.subjectId, classId: form.classId,
        teacherId: userId, termId: form.termId,
      });
      if (res.success && res.note) {
        toast({ title: 'Created', description: 'Opening document...' });
        setCreateOpen(false);
        router.push(`/dashboard/lesson-notes/${res.note.id}`);
      } else {
        throw new Error(res.message);
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, e: any) => {
    e.stopPropagation();
    try {
      await deleteLessonNote(id);
      toast({ title: 'Deleted', description: 'Lesson plan removed.' });
      loadData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 }
  }
  };

  const DocumentCard = ({ note }: { note: any }) => (
    <motion.div variants={itemVariants}>
      <Card 
        className="group cursor-pointer border-slate-800 bg-slate-900/50 hover:bg-slate-800/80 hover:border-violet-500/50 hover:shadow-[0_0_20px_rgba(139,92,246,0.15)] transition-all duration-300 flex flex-col overflow-hidden h-[240px]" 
        onClick={() => router.push(`/dashboard/lesson-notes/${note.id}`)}
      >
        <div className="h-36 bg-gradient-to-br from-slate-800 to-slate-900 border-b border-slate-800 flex items-center justify-center p-4 relative overflow-hidden">
          {/* Subtle background pattern */}
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>
          
          {note.status === 'APPROVED' ? (
             <FileSignature className="w-14 h-14 text-emerald-400/80 drop-shadow-[0_0_15px_rgba(52,211,153,0.3)] z-10 transition-transform group-hover:scale-110 duration-300" />
          ) : note.status === 'SUBMITTED' ? (
             <BookOpen className="w-14 h-14 text-amber-400/80 drop-shadow-[0_0_15px_rgba(251,191,36,0.3)] z-10 transition-transform group-hover:scale-110 duration-300" />
          ) : (
             <FileText className="w-14 h-14 text-violet-400/80 drop-shadow-[0_0_15px_rgba(139,92,246,0.3)] z-10 transition-transform group-hover:scale-110 duration-300" />
          )}
        </div>
        <CardContent className="p-4 flex-1 flex flex-col justify-between">
          <div className="flex justify-between items-start gap-2">
            <h3 className="font-semibold text-sm text-slate-200 line-clamp-2 leading-tight group-hover:text-violet-300 transition-colors">{note.title || 'Untitled Document'}</h3>
            {note.status === 'DRAFT' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                  <Button variant="ghost" className="h-6 w-6 p-0 text-slate-400 hover:text-white hover:bg-slate-700/50 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800">
                  <DropdownMenuItem className="text-red-400 focus:text-red-300 focus:bg-red-950/50 cursor-pointer" onClick={(e) => handleDelete(note.id, e)}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <div className="flex items-center justify-between text-xs mt-3">
             <Badge variant="outline" className={`
                text-[10px] px-2 py-0 font-medium border
                ${note.status === 'APPROVED' ? 'bg-emerald-950/30 text-emerald-400 border-emerald-800' : ''}
                ${note.status === 'SUBMITTED' ? 'bg-amber-950/30 text-amber-400 border-amber-800' : ''}
                ${note.status === 'DRAFT' ? 'bg-slate-800 text-slate-300 border-slate-700' : ''}
             `}>
               {note.status}
             </Badge>
             <span className="text-slate-500 font-medium">{format(new Date(note.submissionDate || note.createdAt), 'MMM d, yyyy')}</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-slate-950 pb-12 -mt-6 -mx-6">
      
      {/* Top Header */}
      <div className="flex justify-between items-center px-8 py-5 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-violet-600/20 border border-violet-500/30 rounded-xl shadow-[0_0_15px_rgba(139,92,246,0.15)]">
            <BookOpen className="text-violet-400 w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Lesson Plans</h1>
            <p className="text-xs text-slate-400 font-medium">Manage and review instructional materials</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 w-80 focus-within:border-violet-500/50 focus-within:ring-1 focus-within:ring-violet-500/50 transition-all shadow-inner">
          <Search className="w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search documents..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-sm w-full text-slate-200 placeholder:text-slate-600" 
          />
        </div>
      </div>

      {/* Start a new document section */}
      <section className="bg-slate-900 px-8 py-10 border-b border-slate-800">
        <div className="max-w-7xl mx-auto">
          <p className="text-sm font-semibold text-slate-300 mb-6 uppercase tracking-wider">Start a new document</p>
          <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
            
            {/* Blank Document Template */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="cursor-pointer group flex flex-col gap-3 min-w-[160px]">
                  <div className="h-56 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center group-hover:border-violet-500 group-hover:bg-slate-900 transition-all shadow-lg group-hover:shadow-[0_0_20px_rgba(139,92,246,0.15)] relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="w-14 h-14 rounded-full bg-violet-600/10 flex items-center justify-center group-hover:bg-violet-600/20 transition-colors">
                      <Plus className="w-8 h-8 text-violet-500" strokeWidth={2.5} />
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-slate-200 text-center">Blank Document</p>
                </motion.div>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-800 text-slate-200 shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="text-white">New Lesson Plan</DialogTitle>
                  <DialogDescription className="text-slate-400">Initialize a new document for your class.</DialogDescription>
                </DialogHeader>
                <div className="space-y-5 py-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Document Title</Label>
                    <Input 
                      className="bg-slate-950 border-slate-800 text-slate-200 focus-visible:ring-violet-500"
                      value={form.title} 
                      onChange={e => setForm(p => ({ ...p, title: e.target.value }))} 
                      placeholder="e.g. Week 1: Introduction to Algebra"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-300">Subject</Label>
                      <Select value={form.subjectId} onValueChange={v => setForm(p => ({ ...p, subjectId: v }))}>
                        <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-200 focus:ring-violet-500"><SelectValue placeholder="Select Subject" /></SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                          {subjects.map(s => <SelectItem key={s.id} value={s.id} className="focus:bg-slate-800 focus:text-white">{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">Class</Label>
                      <Select value={form.classId} onValueChange={v => setForm(p => ({ ...p, classId: v }))}>
                        <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-200 focus:ring-violet-500"><SelectValue placeholder="Select Class" /></SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                          {classes.map(c => <SelectItem key={c.id} value={c.id} className="focus:bg-slate-800 focus:text-white">{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Term</Label>
                    <Select value={form.termId} onValueChange={v => setForm(p => ({ ...p, termId: v }))}>
                      <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-200 focus:ring-violet-500"><SelectValue placeholder="Select Term" /></SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                        {terms.map(t => <SelectItem key={t.id} value={t.id} className="focus:bg-slate-800 focus:text-white">{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter className="border-t border-slate-800 pt-4">
                  <Button variant="ghost" onClick={() => setCreateOpen(false)} className="text-slate-400 hover:text-white hover:bg-slate-800">Cancel</Button>
                  <Button onClick={handleCreate} disabled={isSaving} className="bg-violet-600 hover:bg-violet-700 text-white min-w-[140px]">
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : null}
                    {isSaving ? 'Creating...' : 'Create Document'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Upload Document Template */}
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="cursor-not-allowed group flex flex-col gap-3 min-w-[160px] opacity-60" onClick={() => toast({ title: "Coming soon", description: "Direct file upload will be enabled soon.", variant: "default" })}>
              <div className="h-56 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center transition-all shadow-lg relative overflow-hidden">
                <div className="w-14 h-14 rounded-full bg-slate-800/50 flex items-center justify-center">
                  <Upload className="w-6 h-6 text-slate-500" strokeWidth={2} />
                </div>
              </div>
              <p className="text-sm font-semibold text-slate-400 text-center">Upload File</p>
            </motion.div>

          </div>
        </div>
      </section>

      {/* Recent Documents */}
      <section className="px-8 py-10 max-w-7xl mx-auto">
        <Tabs defaultValue="my-docs" className="w-full">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-lg font-bold text-white">Recent Documents</h2>
            {isReviewer && (
              <TabsList className="bg-slate-900 border border-slate-800 p-1 h-auto gap-1 rounded-xl">
                <TabsTrigger 
                  value="my-docs" 
                  className="rounded-lg px-5 py-2 text-sm font-medium text-slate-400 data-[state=active]:bg-slate-800 data-[state=active]:text-white transition-all"
                >
                  My Docs
                </TabsTrigger>
                <TabsTrigger 
                  value="review" 
                  className="rounded-lg px-5 py-2 text-sm font-medium text-slate-400 data-[state=active]:bg-violet-600 data-[state=active]:text-white transition-all relative"
                >
                  Awaiting Review
                  {pendingNotes.length > 0 && (
                    <span className="ml-2 bg-violet-400/20 text-violet-200 py-0.5 px-2 rounded-full text-xs font-bold">
                      {pendingNotes.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            )}
          </div>

          <TabsContent value="my-docs" className="mt-0 outline-none">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                <p className="font-medium text-sm">Loading your documents...</p>
              </div>
            ) : notes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/50">
                <div className="p-4 bg-slate-800/50 rounded-full mb-4">
                  <FileText className="w-8 h-8 text-slate-500" />
                </div>
                <h3 className="text-lg font-medium text-white mb-1">No documents yet</h3>
                <p className="text-sm text-slate-400 text-center max-w-sm">Create a blank document above to get started with your lesson plans.</p>
              </div>
            ) : (
              <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6"
              >
                <AnimatePresence>
                  {notes.filter(n => n.title?.toLowerCase().includes(searchQuery.toLowerCase())).map(note => <DocumentCard key={note.id} note={note} />)}
                </AnimatePresence>
              </motion.div>
            )}
          </TabsContent>

          {isReviewer && (
            <TabsContent value="review" className="mt-0 outline-none">
              {pendingNotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/50">
                  <div className="p-4 bg-slate-800/50 rounded-full mb-4">
                    <BookOpen className="w-8 h-8 text-slate-500" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-1">All caught up!</h3>
                  <p className="text-sm text-slate-400">There are no documents awaiting your review right now.</p>
                </div>
              ) : (
                <motion.div 
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6"
                >
                  <AnimatePresence>
                    {pendingNotes.filter(n => n.title?.toLowerCase().includes(searchQuery.toLowerCase()) || n.teacher?.firstName?.toLowerCase().includes(searchQuery.toLowerCase())).map(note => <DocumentCard key={note.id} note={note} />)}
                  </AnimatePresence>
                </motion.div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </section>

    </div>
  );
}
