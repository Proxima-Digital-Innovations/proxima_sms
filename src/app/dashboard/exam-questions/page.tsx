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
import { createQuestionPaper, getQuestionPapers, deleteQuestionPaper } from '@/actions/question-paper-actions';
import { getAcademicData } from '@/actions/academic-data';
import { Plus, FileQuestion, Upload, MoreVertical, Search, FileSignature, Loader2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { motion, AnimatePresence } from 'framer-motion';

const OFFICER_ROLES = ['EXAM_OFFICER', 'ADMIN', 'SUPER_ADMIN'];
const PAPER_TYPES = ['CA Test', 'Mid-Term Exam', 'Final Exam'];

export default function QuestionPapersPage() {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;
  const userRole = (session?.user as any)?.role;
  const { toast } = useToast();
  const router = useRouter();

  const [myPapers, setMyPapers] = useState<any[]>([]);
  const [reviewQueue, setReviewQueue] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState({
    title: 'Untitled Question Paper', subjectId: '', classId: '', termId: '', paperType: 'CA Test'
  });

  const [searchQuery, setSearchQuery] = useState('');

  const isOfficer = OFFICER_ROLES.includes((userRole || '').toUpperCase());

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const [acadRes, myRes, queueRes] = await Promise.all([
        getAcademicData(),
        getQuestionPapers({ teacherId: userId }),
        isOfficer ? getQuestionPapers({ status: 'SUBMITTED' }) : Promise.resolve({ success: true, papers: [] }),
      ]);
      setSubjects(acadRes.subjects || []);
      setClasses(acadRes.classes || []);
      setTerms(acadRes.terms || []);
      if (myRes.success) setMyPapers(myRes.papers || []);
      if (queueRes.success) setReviewQueue((queueRes.papers || []).filter((p: any) => p.teacherId !== userId));
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
      const res = await createQuestionPaper({
        title: form.title, subjectId: form.subjectId, classId: form.classId,
        teacherId: userId, termId: form.termId, paperType: form.paperType
      });
      if (res.success && res.paper) {
        toast({ title: 'Created', description: 'Opening document...' });
        setCreateOpen(false);
        router.push(`/dashboard/exam-questions/${res.paper.id}`);
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
      await deleteQuestionPaper(id);
      toast({ title: 'Deleted', description: 'Question paper removed.' });
      loadData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    }
  };

  const containerVariants: any = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  const DocumentCard = ({ paper }: { paper: any }) => (
    <motion.div variants={itemVariants}>
      <Card 
        className="group cursor-pointer border-border bg-background hover:bg-muted hover:border-violet-500/50 hover:shadow-[0_0_20px_rgba(139,92,246,0.15)] transition-all duration-300 flex flex-col overflow-hidden h-[240px]" 
        onClick={() => router.push(`/dashboard/exam-questions/${paper.id}`)}
      >
        <div className="h-36 bg-gradient-to-br from-slate-800 to-slate-900 border-b border-border flex items-center justify-center p-4 relative overflow-hidden">
          {/* Subtle background pattern */}
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>
          
          {paper.status === 'APPROVED' ? (
             <FileSignature className="w-14 h-14 text-emerald-400/80 drop-shadow-[0_0_15px_rgba(52,211,153,0.3)] z-10 transition-transform group-hover:scale-110 duration-300" />
          ) : paper.status === 'SUBMITTED' ? (
             <FileQuestion className="w-14 h-14 text-amber-400/80 drop-shadow-[0_0_15px_rgba(251,191,36,0.3)] z-10 transition-transform group-hover:scale-110 duration-300" />
          ) : (
             <FileQuestion className="w-14 h-14 text-violet-400/80 drop-shadow-[0_0_15px_rgba(139,92,246,0.3)] z-10 transition-transform group-hover:scale-110 duration-300" />
          )}
        </div>
        <CardContent className="p-4 flex-1 flex flex-col justify-between">
          <div className="flex justify-between items-start gap-2">
            <h3 className="font-semibold text-sm text-foreground line-clamp-2 leading-tight group-hover:text-violet-300 transition-colors">{paper.title || 'Untitled Document'}</h3>
            {paper.status === 'DRAFT' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                  <Button variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-white hover:bg-slate-700/50 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-background border-border">
                  <DropdownMenuItem className="text-red-400 focus:text-red-300 focus:bg-red-950/50 cursor-pointer" onClick={(e) => handleDelete(paper.id, e)}>
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
                ${paper.status === 'APPROVED' ? 'bg-emerald-950/30 text-emerald-400 border-emerald-800' : ''}
                ${paper.status === 'SUBMITTED' ? 'bg-amber-950/30 text-amber-400 border-amber-800' : ''}
                ${paper.status === 'DRAFT' ? 'bg-muted text-foreground border-border' : ''}
             `}>
               {paper.status}
             </Badge>
             <span className="text-muted-foreground font-medium">{format(new Date(paper.submissionDate || paper.createdAt), 'MMM d, yyyy')}</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-background pb-12 -mt-6 -mx-6">
      
      {/* Top Header */}
      <div className="flex justify-between items-center px-8 py-5 bg-background backdrop-blur-md border-b border-border sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-violet-600/20 border border-violet-500/30 rounded-xl shadow-[0_0_15px_rgba(139,92,246,0.15)]">
            <FileQuestion className="text-violet-400 w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">Question Papers</h1>
            <p className="text-xs text-muted-foreground font-medium">Manage and review exam questions</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-4 py-2.5 w-80 focus-within:border-violet-500/50 focus-within:ring-1 focus-within:ring-violet-500/50 transition-all shadow-inner">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search documents..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-sm w-full text-foreground placeholder:text-slate-600" 
          />
        </div>
      </div>

      {/* Start a new document section */}
      <section className="bg-background px-8 py-10 border-b border-border">
        <div className="w-full">
          <p className="text-sm font-semibold text-foreground mb-6 uppercase tracking-wider">Start a new document</p>
          <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
            
            {/* Blank Document Template */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="cursor-pointer group flex flex-col gap-3 min-w-[160px]">
                  <div className="h-56 bg-background border border-border rounded-xl flex items-center justify-center group-hover:border-violet-500 group-hover:bg-background transition-all shadow-lg group-hover:shadow-[0_0_20px_rgba(139,92,246,0.15)] relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="w-14 h-14 rounded-full bg-violet-600/10 flex items-center justify-center group-hover:bg-violet-600/20 transition-colors">
                      <Plus className="w-8 h-8 text-violet-500" strokeWidth={2.5} />
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-foreground text-center">Blank Document</p>
                </motion.div>
              </DialogTrigger>
              <DialogContent className="bg-background border-border text-foreground shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="text-foreground">New Question Paper</DialogTitle>
                  <DialogDescription className="text-muted-foreground">Initialize a new document.</DialogDescription>
                </DialogHeader>
                <div className="space-y-5 py-4">
                  <div className="space-y-2">
                    <Label className="text-foreground">Title</Label>
                    <Input 
                      className="bg-background border-border text-foreground focus-visible:ring-violet-500"
                      value={form.title} 
                      onChange={e => setForm(p => ({ ...p, title: e.target.value }))} 
                      placeholder="e.g. Mid-Term Algebra Test"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-foreground">Subject</Label>
                      <Select value={form.subjectId} onValueChange={v => setForm(p => ({ ...p, subjectId: v }))}>
                        <SelectTrigger className="bg-background border-border text-foreground focus:ring-violet-500"><SelectValue placeholder="Select Subject" /></SelectTrigger>
                        <SelectContent className="bg-background border-border text-foreground">
                          {subjects.map(s => <SelectItem key={s.id} value={s.id} className="focus:bg-muted focus:text-foreground">{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground">Class</Label>
                      <Select value={form.classId} onValueChange={v => setForm(p => ({ ...p, classId: v }))}>
                        <SelectTrigger className="bg-background border-border text-foreground focus:ring-violet-500"><SelectValue placeholder="Select Class" /></SelectTrigger>
                        <SelectContent className="bg-background border-border text-foreground">
                          {classes.map(c => <SelectItem key={c.id} value={c.id} className="focus:bg-muted focus:text-foreground">{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-foreground">Term</Label>
                      <Select value={form.termId} onValueChange={v => setForm(p => ({ ...p, termId: v }))}>
                        <SelectTrigger className="bg-background border-border text-foreground focus:ring-violet-500"><SelectValue placeholder="Select Term" /></SelectTrigger>
                        <SelectContent className="bg-background border-border text-foreground">
                          {terms.map(t => <SelectItem key={t.id} value={t.id} className="focus:bg-muted focus:text-foreground">{t.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground">Paper Type</Label>
                      <Select value={form.paperType} onValueChange={v => setForm(p => ({ ...p, paperType: v }))}>
                        <SelectTrigger className="bg-background border-border text-foreground focus:ring-violet-500"><SelectValue placeholder="Select Type" /></SelectTrigger>
                        <SelectContent className="bg-background border-border text-foreground">
                          {PAPER_TYPES.map(t => <SelectItem key={t} value={t} className="focus:bg-muted focus:text-foreground">{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter className="border-t border-border pt-4">
                  <Button variant="ghost" onClick={() => setCreateOpen(false)} className="text-muted-foreground hover:text-foreground hover:bg-muted">Cancel</Button>
                  <Button onClick={handleCreate} disabled={isSaving} className="bg-violet-600 hover:bg-violet-700 text-white min-w-[140px]">
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : null}
                    {isSaving ? 'Creating...' : 'Create Document'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Upload Document Template */}
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="cursor-not-allowed group flex flex-col gap-3 min-w-[160px] opacity-60" onClick={() => toast({ title: "Coming soon", description: "Direct file upload will be enabled soon.", variant: "default" })}>
              <div className="h-56 bg-background border border-border rounded-xl flex items-center justify-center transition-all shadow-lg relative overflow-hidden">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                  <Upload className="w-6 h-6 text-muted-foreground" strokeWidth={2} />
                </div>
              </div>
              <p className="text-sm font-semibold text-muted-foreground text-center">Upload File</p>
            </motion.div>

          </div>
        </div>
      </section>

      {/* Recent Documents */}
      <section className="w-full space-y-5">
        <Tabs defaultValue="my-docs" className="w-full">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-lg font-bold text-foreground">Recent Documents</h2>
            {isOfficer && (
              <TabsList className="bg-background border border-border p-1 h-auto gap-1 rounded-xl">
                <TabsTrigger 
                  value="my-docs" 
                  className="rounded-lg px-5 py-2 text-sm font-medium text-muted-foreground data-[state=active]:bg-muted data-[state=active]:text-foreground transition-all"
                >
                  My Docs
                </TabsTrigger>
                <TabsTrigger 
                  value="review" 
                  className="rounded-lg px-5 py-2 text-sm font-medium text-muted-foreground data-[state=active]:bg-violet-600 data-[state=active]:text-white transition-all relative"
                >
                  Awaiting Review
                  {reviewQueue.length > 0 && (
                    <span className="ml-2 bg-violet-400/20 text-violet-200 py-0.5 px-2 rounded-full text-xs font-bold">
                      {reviewQueue.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            )}
          </div>

          <TabsContent value="my-docs" className="mt-0 outline-none">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                <p className="font-medium text-sm">Loading your documents...</p>
              </div>
            ) : myPapers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-xl bg-background">
                <div className="p-4 bg-muted rounded-full mb-4">
                  <FileQuestion className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-1">No documents yet</h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm">Create a blank document above to get started with your exam questions.</p>
              </div>
            ) : (
              <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6"
              >
                <AnimatePresence>
                  {myPapers.filter(n => n.title?.toLowerCase().includes(searchQuery.toLowerCase())).map(paper => <DocumentCard key={paper.id} paper={paper} />)}
                </AnimatePresence>
              </motion.div>
            )}
          </TabsContent>

          {isOfficer && (
            <TabsContent value="review" className="mt-0 outline-none">
              {reviewQueue.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-xl bg-background">
                  <div className="p-4 bg-muted rounded-full mb-4">
                    <FileQuestion className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-1">All caught up!</h3>
                  <p className="text-sm text-muted-foreground">There are no question papers awaiting your review right now.</p>
                </div>
              ) : (
                <motion.div 
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6"
                >
                  <AnimatePresence>
                    {reviewQueue.filter(n => n.title?.toLowerCase().includes(searchQuery.toLowerCase()) || n.teacher?.firstName?.toLowerCase().includes(searchQuery.toLowerCase())).map(paper => <DocumentCard key={paper.id} paper={paper} />)}
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
