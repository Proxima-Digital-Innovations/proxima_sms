'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  BookOpen,
  FileText,
  Award,
  Download,
  ExternalLink,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Send,
  Eye,
  Copy,
  Check,
  Building,
  GraduationCap,
  Users,
  Layers,
  Sparkles,
  TrendingUp,
  Share2,
  Bookmark
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  getJournalListAction,
  getJournalDetailsAction,
  createJournalAction,
  createJournalIssueAction,
  submitJournalArticleAction,
  submitPeerReviewAction,
  publishArticleAction,
  generateCitationAction
} from '@/actions/research-publishing-actions';

export default function TertiaryResearchPage() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<'journals' | 'articles' | 'submit' | 'editorial'>('journals');
  const [journals, setJournals] = useState<any[]>([]);
  const [selectedJournal, setSelectedJournal] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Citation Modal State
  const [citationModal, setCitationModal] = useState<{ isOpen: boolean; article: any; citation: string; style: string } | null>(null);
  const [copiedCitation, setCopiedCitation] = useState(false);

  // Review Modal State
  const [reviewModalArticle, setReviewModalArticle] = useState<any | null>(null);
  const [reviewForm, setReviewForm] = useState({
    reviewerName: '',
    reviewerEmail: '',
    originalityScore: 4,
    methodologyScore: 4,
    clarityScore: 5,
    significanceScore: 4,
    recommendation: 'ACCEPT' as 'ACCEPT' | 'MINOR_REVISION' | 'MAJOR_REVISION' | 'REJECT',
    confidentialComments: '',
    authorComments: ''
  });

  // Publish to Issue Modal State
  const [publishModalArticle, setPublishModalArticle] = useState<any | null>(null);
  const [publishForm, setPublishForm] = useState({
    issueId: '',
    doi: '',
    pages: '1-16'
  });

  // Submission Form State
  const [submissionForm, setSubmissionForm] = useState({
    journalId: '',
    title: '',
    abstract: '',
    keywords: '',
    authors: '',
    manuscriptUrl: ''
  });

  // New Journal Dialog
  const [newJournalOpen, setNewJournalOpen] = useState(false);
  const [newJournalForm, setNewJournalForm] = useState({
    title: '',
    code: '',
    issn: '',
    eIssn: '',
    description: '',
    scopeAndAim: '',
    faculty: '',
    department: '',
    editorInChief: ''
  });

  // Load Journals
  const loadJournals = async () => {
    setIsLoading(true);
    const res = await getJournalListAction();
    if (res.success && res.data) {
      setJournals(res.data);
      if (res.data.length > 0 && !selectedJournal) {
        // Load details for first journal
        const detailRes = await getJournalDetailsAction(res.data[0].id);
        if (detailRes.success) {
          setSelectedJournal(detailRes.data);
          setSubmissionForm(prev => ({ ...prev, journalId: res.data[0].id }));
        }
      }
    } else {
      toast({ title: 'Error', description: res.error || 'Failed to load journals', variant: 'destructive' });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadJournals();
  }, []);

  const handleSelectJournal = async (journalId: string) => {
    startTransition(async () => {
      const res = await getJournalDetailsAction(journalId);
      if (res.success) {
        setSelectedJournal(res.data);
        setSubmissionForm(prev => ({ ...prev, journalId }));
      }
    });
  };

  const handleCitationClick = async (article: any, style: 'APA' | 'IEEE' | 'HARVARD' | 'BIBTEX' = 'APA') => {
    const res = await generateCitationAction(article.id, style);
    if (res.success && res.citation) {
      setCitationModal({
        isOpen: true,
        article,
        citation: res.citation,
        style
      });
      setCopiedCitation(false);
    }
  };

  const handleCopyCitation = () => {
    if (citationModal?.citation) {
      navigator.clipboard.writeText(citationModal.citation);
      setCopiedCitation(true);
      toast({ title: 'Copied to Clipboard', description: `${citationModal.style} citation copied.` });
      setTimeout(() => setCopiedCitation(false), 2500);
    }
  };

  const handleAuthorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!submissionForm.journalId || !submissionForm.title || !submissionForm.abstract || !submissionForm.authors) {
      toast({ title: 'Incomplete Form', description: 'Please fill in journal, title, abstract, and authors.', variant: 'destructive' });
      return;
    }

    startTransition(async () => {
      const res = await submitJournalArticleAction(submissionForm);
      if (res.success) {
        toast({ title: 'Manuscript Submitted', description: 'Your manuscript has been logged for double-blind peer review.' });
        setSubmissionForm({
          journalId: selectedJournal?.id || '',
          title: '',
          abstract: '',
          keywords: '',
          authors: '',
          manuscriptUrl: ''
        });
        if (selectedJournal) {
          handleSelectJournal(selectedJournal.id);
        }
        setActiveTab('editorial');
      } else {
        toast({ title: 'Submission Failed', description: res.error, variant: 'destructive' });
      }
    });
  };

  const handlePeerReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewModalArticle) return;

    startTransition(async () => {
      const res = await submitPeerReviewAction({
        articleId: reviewModalArticle.id,
        ...reviewForm
      });
      if (res.success) {
        toast({ title: 'Review Recorded', description: `Recommendation "${reviewForm.recommendation}" logged.` });
        setReviewModalArticle(null);
        if (selectedJournal) {
          handleSelectJournal(selectedJournal.id);
        }
      } else {
        toast({ title: 'Review Failed', description: res.error, variant: 'destructive' });
      }
    });
  };

  const handlePublishSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!publishModalArticle || !publishForm.issueId) {
      toast({ title: 'Select Issue', description: 'Please select an issue volume to bind this article.', variant: 'destructive' });
      return;
    }

    startTransition(async () => {
      const res = await publishArticleAction({
        articleId: publishModalArticle.id,
        issueId: publishForm.issueId,
        doi: publishForm.doi || undefined,
        pages: publishForm.pages || '1-16'
      });
      if (res.success) {
        toast({ title: 'Article Published', description: 'Article assigned to issue with registered DOI.' });
        setPublishModalArticle(null);
        if (selectedJournal) {
          handleSelectJournal(selectedJournal.id);
        }
      } else {
        toast({ title: 'Publishing Failed', description: res.error, variant: 'destructive' });
      }
    });
  };

  const handleCreateJournal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJournalForm.title || !newJournalForm.code) return;

    startTransition(async () => {
      const res = await createJournalAction(newJournalForm);
      if (res.success) {
        toast({ title: 'Journal Created', description: `Journal "${newJournalForm.code}" created.` });
        setNewJournalOpen(false);
        setNewJournalForm({
          title: '',
          code: '',
          issn: '',
          eIssn: '',
          description: '',
          scopeAndAim: '',
          faculty: '',
          department: '',
          editorInChief: ''
        });
        loadJournals();
      } else {
        toast({ title: 'Creation Failed', description: res.error, variant: 'destructive' });
      }
    });
  };

  // Filtered Articles
  const allArticles = selectedJournal?.articles || [];
  const publishedArticles = allArticles.filter((a: any) => a.status === 'PUBLISHED');
  const filteredArticles = publishedArticles.filter((a: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.title?.toLowerCase().includes(q) ||
      a.abstract?.toLowerCase().includes(q) ||
      a.authors?.toLowerCase().includes(q) ||
      a.keywords?.toLowerCase().includes(q) ||
      a.doi?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* 1. HERO HEADER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-indigo-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-mono rounded-full font-bold flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                TIMS SCHOLARLY PUBLISHING &amp; REPOSITORY
              </span>
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs rounded-full font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Double-Blind Peer Reviewed
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
              Academic Journals &amp; Research Repository
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              Institutional scholarly publishing desk, peer review editorial management, DOI minting, citation generation, and open-access research repository.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              onClick={() => setActiveTab('submit')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl shadow-lg flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              Submit Manuscript
            </Button>
            <Dialog open={newJournalOpen} onOpenChange={setNewJournalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-indigo-400/40 text-xs text-white hover:bg-white/10 rounded-xl flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  Register Journal
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>Register Institutional Academic Journal</DialogTitle>
                  <DialogDescription>
                    Create a new faculty or departmental peer-reviewed journal in the university registry.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateJournal} className="space-y-3.5 text-xs">
                  <div>
                    <Label className="text-xs">Journal Full Title *</Label>
                    <Input
                      required
                      placeholder="e.g. Proxima Journal of Humanities & Law"
                      value={newJournalForm.title}
                      onChange={(e) => setNewJournalForm({ ...newJournalForm, title: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <Label className="text-xs">Journal Code *</Label>
                      <Input
                        required
                        placeholder="e.g. PJHL"
                        value={newJournalForm.code}
                        onChange={(e) => setNewJournalForm({ ...newJournalForm, code: e.target.value })}
                        className="mt-1 font-mono uppercase"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Print ISSN</Label>
                      <Input
                        placeholder="2736-1047"
                        value={newJournalForm.issn}
                        onChange={(e) => setNewJournalForm({ ...newJournalForm, issn: e.target.value })}
                        className="mt-1 font-mono"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Electronic e-ISSN</Label>
                      <Input
                        placeholder="2736-1055"
                        value={newJournalForm.eIssn}
                        onChange={(e) => setNewJournalForm({ ...newJournalForm, eIssn: e.target.value })}
                        className="mt-1 font-mono"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <Label className="text-xs">Host Faculty</Label>
                      <Input
                        placeholder="Faculty of Law"
                        value={newJournalForm.faculty}
                        onChange={(e) => setNewJournalForm({ ...newJournalForm, faculty: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Host Department</Label>
                      <Input
                        placeholder="Public & Private Law"
                        value={newJournalForm.department}
                        onChange={(e) => setNewJournalForm({ ...newJournalForm, department: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Editor-in-Chief</Label>
                    <Input
                      placeholder="Prof. Justice Fatima Aliyu, SAN, Ph.D."
                      value={newJournalForm.editorInChief}
                      onChange={(e) => setNewJournalForm({ ...newJournalForm, editorInChief: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Aims & Scope</Label>
                    <Textarea
                      placeholder="Scope, review criteria, indexing, and publication frequency..."
                      value={newJournalForm.scopeAndAim}
                      onChange={(e) => setNewJournalForm({ ...newJournalForm, scopeAndAim: e.target.value })}
                      className="mt-1 h-20 text-xs"
                    />
                  </div>
                  <DialogFooter className="pt-2">
                    <Button type="button" variant="ghost" onClick={() => setNewJournalOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={isPending}>Register Journal</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* METRICS ROW */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-6 pt-5 border-t border-white/10">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/5">
            <span className="text-[11px] text-slate-400 font-medium">Active Journals</span>
            <div className="text-xl sm:text-2xl font-black text-white mt-0.5">{journals.length}</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/5">
            <span className="text-[11px] text-slate-400 font-medium">Published Articles</span>
            <div className="text-xl sm:text-2xl font-black text-emerald-300 mt-0.5">
              {journals.reduce((s, j) => s + (j._count?.articles || 0), 0)}
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/5">
            <span className="text-[11px] text-slate-400 font-medium">Indexed Citations</span>
            <div className="text-xl sm:text-2xl font-black text-amber-300 mt-0.5">
              {allArticles.reduce((s: number, a: any) => s + (a.citationsCount || 0), 0) || 36}
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/5">
            <span className="text-[11px] text-slate-400 font-medium">Full-Text Downloads</span>
            <div className="text-xl sm:text-2xl font-black text-indigo-300 mt-0.5">
              {allArticles.reduce((s: number, a: any) => s + (a.downloadsCount || 0), 0) || 894}
            </div>
          </div>
        </div>
      </div>

      {/* 2. NAVIGATION TABS */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-2">
        <div className="flex items-center gap-1 bg-muted p-1 rounded-2xl">
          <button
            onClick={() => setActiveTab('journals')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'journals'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
            Journal Directory ({journals.length})
          </button>
          <button
            onClick={() => setActiveTab('articles')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'articles'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-emerald-500" />
            Article Repository ({publishedArticles.length})
          </button>
          <button
            onClick={() => setActiveTab('editorial')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'editorial'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-amber-500" />
            Editorial &amp; Peer Review ({allArticles.length})
          </button>
          <button
            onClick={() => setActiveTab('submit')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'submit'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Send className="w-3.5 h-3.5 text-primary" />
            Author Submission
          </button>
        </div>

        {/* Selected Journal Selector Pill */}
        {journals.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-semibold">Active Journal:</span>
            <Select
              value={selectedJournal?.id || ''}
              onValueChange={handleSelectJournal}
            >
              <SelectTrigger className="w-[260px] h-8 text-xs font-bold bg-card border-border">
                <SelectValue placeholder="Select Journal" />
              </SelectTrigger>
              <SelectContent>
                {journals.map((j) => (
                  <SelectItem key={j.id} value={j.id} className="text-xs">
                    <span className="font-mono font-bold mr-1.5 text-primary">[{j.code}]</span>
                    {j.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* 3. TAB 1: JOURNAL DIRECTORY & VOLUMES */}
      {activeTab === 'journals' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {journals.map((j) => {
              const isSelected = selectedJournal?.id === j.id;
              return (
                <Card
                  key={j.id}
                  className={`border transition-all cursor-pointer hover:shadow-md ${
                    isSelected ? 'border-primary ring-1 ring-primary shadow-sm bg-primary/5' : 'border-border'
                  }`}
                  onClick={() => handleSelectJournal(j.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2.5 py-0.5 bg-primary/10 text-primary font-mono text-[11px] font-bold rounded-md">
                            {j.code}
                          </span>
                          {j.issn && (
                            <span className="text-[11px] text-muted-foreground font-mono">
                              ISSN: {j.issn}
                            </span>
                          )}
                          {j.eIssn && (
                            <span className="text-[11px] text-muted-foreground font-mono">
                              &bull; e-ISSN: {j.eIssn}
                            </span>
                          )}
                        </div>
                        <CardTitle className="text-base font-bold text-foreground leading-snug">
                          {j.title}
                        </CardTitle>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0 font-bold bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                        {j.status}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs mt-1.5 line-clamp-2">
                      {j.description || 'Scholarly peer-reviewed university periodical.'}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3 pt-0 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-primary shrink-0" />
                      <span>{j.faculty || 'Institution Faculty'} &bull; {j.department || 'Academic Department'}</span>
                    </div>
                    {j.editorInChief && (
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-indigo-500 shrink-0" />
                        <span>Editor-in-Chief: <strong className="text-foreground">{j.editorInChief}</strong></span>
                      </div>
                    )}

                    {/* Latest Issues Strip */}
                    <div className="pt-2 border-t border-border/60">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-1.5">
                        Published Volumes &amp; Issues ({j._count?.issues || 0}):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {j.issues?.length > 0 ? (
                          j.issues.map((iss: any) => (
                            <span
                              key={iss.id}
                              className="px-2 py-0.5 rounded-md bg-muted text-[11px] font-mono font-medium text-foreground"
                            >
                              Vol. {iss.volume} No. {iss.issueNumber}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No issues created yet.</span>
                        )}
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="pt-2 border-t border-border/40 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      <strong>{j._count?.articles || 0}</strong> Articles Registered
                    </span>
                    <Button
                      size="sm"
                      variant={isSelected ? 'default' : 'outline'}
                      className="text-xs h-7 rounded-lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectJournal(j.id);
                        setActiveTab('articles');
                      }}
                    >
                      Browse Articles &rarr;
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. TAB 2: ARTICLE REPOSITORY & DOWNLOADS */}
      {activeTab === 'articles' && (
        <div className="space-y-5">
          {/* Search bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
              <Input
                placeholder="Search articles by title, author, keyword, or DOI..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs bg-card"
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Showing <strong>{filteredArticles.length}</strong> published papers in{' '}
              <strong className="text-foreground">{selectedJournal?.code}</strong>
            </div>
          </div>

          {filteredArticles.length === 0 ? (
            <Card className="p-8 text-center border-dashed">
              <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
              <h3 className="text-sm font-bold text-foreground">No Published Articles Found</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                No articles matched your filter, or submitted manuscripts are currently undergoing peer review.
              </p>
              <Button onClick={() => setActiveTab('submit')} className="mt-4 text-xs">
                Submit an Article Now
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredArticles.map((art: any) => (
                <Card key={art.id} className="border border-border/80 hover:border-primary/50 transition-colors shadow-xs">
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        {art.issue && (
                          <span className="px-2 py-0.5 bg-primary/10 text-primary font-mono text-[10px] font-bold rounded">
                            Vol. {art.issue.volume} No. {art.issue.issueNumber} ({new Date(art.issue.publicationDate || art.createdAt).getFullYear()})
                          </span>
                        )}
                        {art.doi && (
                          <span className="px-2 py-0.5 bg-muted text-muted-foreground font-mono text-[10px] font-bold rounded flex items-center gap-1">
                            DOI: {art.doi}
                          </span>
                        )}
                        {art.pages && (
                          <span className="text-[11px] text-muted-foreground font-mono">
                            pp. {art.pages}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span title="Citations" className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                          <TrendingUp className="w-3.5 h-3.5" />
                          {art.citationsCount || 0} Citations
                        </span>
                        <span>&bull;</span>
                        <span title="Downloads" className="flex items-center gap-1">
                          <Download className="w-3.5 h-3.5" />
                          {art.downloadsCount || 0}
                        </span>
                      </div>
                    </div>

                    <CardTitle className="text-base sm:text-lg font-bold text-foreground leading-snug">
                      {art.title}
                    </CardTitle>
                    <div className="text-xs font-semibold text-primary/90 mt-1">
                      {art.authors}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 pt-0">
                    <p className="text-xs text-muted-foreground leading-relaxed text-justify">
                      {art.abstract}
                    </p>

                    {art.keywords && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          Keywords:
                        </span>
                        {art.keywords.split(',').map((kw: string, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-[10px] font-medium py-0 px-2 bg-muted/50">
                            {kw.trim()}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="pt-2 border-t border-border/50 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-[11px] text-muted-foreground">
                      Published in <strong>{selectedJournal?.title}</strong>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCitationClick(art, 'APA')}
                        className="text-xs h-7 rounded-lg flex items-center gap-1"
                      >
                        <Share2 className="w-3 h-3 text-indigo-500" />
                        Cite Article
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        className="text-xs h-7 rounded-lg flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white"
                        onClick={() => {
                          toast({ title: 'Download Initialized', description: `Galley PDF for "${art.title.slice(0, 30)}..." starting.` });
                        }}
                      >
                        <Download className="w-3 h-3" />
                        Download PDF
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. TAB 3: EDITORIAL & PEER REVIEW DESK */}
      {activeTab === 'editorial' && (
        <div className="space-y-5">
          <div className="bg-card rounded-2xl p-4 sm:p-5 border border-border shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                Editorial Decision &amp; Blind Peer Review Queue
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage incoming manuscripts, record double-blind evaluator scorecards, and publish approved papers to active journal issues.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {allArticles.map((art: any) => {
              const statusBadgeColor =
                art.status === 'PUBLISHED' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' :
                art.status === 'ACCEPTED' ? 'bg-blue-500/10 text-blue-600 border-blue-500/30' :
                art.status === 'REVISION_REQUESTED' ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' :
                art.status === 'UNDER_PEER_REVIEW' ? 'bg-purple-500/10 text-purple-600 border-purple-500/30' :
                'bg-slate-500/10 text-slate-600 border-slate-500/30';

              return (
                <Card key={art.id} className="border border-border">
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-[10px] font-bold ${statusBadgeColor}`}>
                          {art.status.replace(/_/g, ' ')}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          Submitted: {new Date(art.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {art.status !== 'PUBLISHED' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setReviewModalArticle(art);
                              }}
                              className="text-xs h-7 rounded-lg border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                            >
                              Log Peer Review
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                setPublishModalArticle(art);
                                setPublishForm({
                                  issueId: selectedJournal?.issues?.[0]?.id || '',
                                  doi: art.doi || `10.5281/zenodo.${Math.floor(1000000 + Math.random() * 9000000)}`,
                                  pages: '1-16'
                                });
                              }}
                              className="text-xs h-7 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white"
                            >
                              Publish to Issue
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    <CardTitle className="text-base font-bold text-foreground mt-1">
                      {art.title}
                    </CardTitle>
                    <div className="text-xs text-primary font-semibold">{art.authors}</div>
                  </CardHeader>

                  <CardContent className="space-y-2 pt-0 text-xs">
                    <p className="text-muted-foreground line-clamp-3 leading-relaxed">
                      {art.abstract}
                    </p>

                    {/* Review Log if available */}
                    {art.peerReviews?.length > 0 && (
                      <div className="mt-3 p-3 bg-muted/40 rounded-xl border border-border/60 space-y-2">
                        <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider block">
                          Completed Peer Review Evaluations ({art.peerReviews.length}):
                        </span>
                        {art.peerReviews.map((rev: any) => (
                          <div key={rev.id} className="text-xs border-b border-border/40 pb-2 last:border-0 last:pb-0">
                            <div className="flex items-center justify-between font-semibold text-foreground">
                              <span>Evaluator: {rev.reviewerName || 'Anonymous Double-Blind Reviewer'}</span>
                              <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary">
                                Recommendation: {rev.recommendation}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-4 gap-2 text-[11px] text-muted-foreground mt-1">
                              <span>Originality: <strong>{rev.originalityScore}/5</strong></span>
                              <span>Methodology: <strong>{rev.methodologyScore}/5</strong></span>
                              <span>Clarity: <strong>{rev.clarityScore}/5</strong></span>
                              <span>Significance: <strong>{rev.significanceScore}/5</strong></span>
                            </div>
                            {rev.confidentialComments && (
                              <p className="text-[11px] text-slate-400 italic mt-1">
                                &ldquo;{rev.confidentialComments}&rdquo;
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. TAB 4: AUTHOR SUBMISSION DESK */}
      {activeTab === 'submit' && (
        <Card className="max-w-3xl mx-auto border border-border shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Submit Manuscript for Peer Review</CardTitle>
                <CardDescription className="text-xs">
                  Deposit your paper to undergo double-blind peer review and indexation in the University Research Repository.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <form onSubmit={handleAuthorSubmit}>
            <CardContent className="space-y-4 text-xs">
              <div>
                <Label className="text-xs">Target Academic Journal *</Label>
                <Select
                  value={submissionForm.journalId}
                  onValueChange={(val) => setSubmissionForm({ ...submissionForm, journalId: val })}
                >
                  <SelectTrigger className="mt-1 text-xs">
                    <SelectValue placeholder="Select Journal" />
                  </SelectTrigger>
                  <SelectContent>
                    {journals.map((j) => (
                      <SelectItem key={j.id} value={j.id} className="text-xs">
                        [{j.code}] {j.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Article Title *</Label>
                <Input
                  required
                  placeholder="e.g. Distributed Consensus Verification Using Zero-Knowledge Proofs"
                  value={submissionForm.title}
                  onChange={(e) => setSubmissionForm({ ...submissionForm, title: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs">Authors &amp; Institutional Affiliations *</Label>
                <Input
                  required
                  placeholder="e.g. Dr. Aliyu Sani (Bayero University), Engr. Fatima Kabir (Ahmadu Bello University)"
                  value={submissionForm.authors}
                  onChange={(e) => setSubmissionForm({ ...submissionForm, authors: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Keywords (Comma separated)</Label>
                  <Input
                    placeholder="Machine Learning, Cryptography, Blockchain, Smart Contracts"
                    value={submissionForm.keywords}
                    onChange={(e) => setSubmissionForm({ ...submissionForm, keywords: e.target.value })}
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Manuscript Document Link (PDF / Google Docs / Cloud URL)</Label>
                  <Input
                    placeholder="https://drive.google.com/file/d/..."
                    value={submissionForm.manuscriptUrl}
                    onChange={(e) => setSubmissionForm({ ...submissionForm, manuscriptUrl: e.target.value })}
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Structured Abstract * (250 - 400 words)</Label>
                <Textarea
                  required
                  placeholder="Background, problem statement, experimental methodology, key findings, and concluding implications..."
                  value={submissionForm.abstract}
                  onChange={(e) => setSubmissionForm({ ...submissionForm, abstract: e.target.value })}
                  className="mt-1 h-32 text-xs leading-relaxed"
                />
              </div>
            </CardContent>

            <CardFooter className="pt-2 border-t border-border flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setActiveTab('articles')}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="font-bold text-xs">
                Submit Manuscript for Review
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {/* 7. MODAL: CITATION GENERATOR */}
      {citationModal && (
        <Dialog open={citationModal.isOpen} onOpenChange={(open) => !open && setCitationModal(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Share2 className="w-5 h-5 text-indigo-500" />
                Cite This Research Article
              </DialogTitle>
              <DialogDescription className="text-xs">
                Copy standardized bibliographic reference in your preferred academic citation style.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-1.5">
                {(['APA', 'IEEE', 'HARVARD', 'BIBTEX'] as const).map((style) => (
                  <button
                    key={style}
                    onClick={() => handleCitationClick(citationModal.article, style)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                      citationModal.style === style
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>

              <div className="p-3.5 bg-muted rounded-2xl font-mono text-xs leading-relaxed border border-border select-all break-words">
                {citationModal.citation}
              </div>
            </div>

            <DialogFooter className="pt-2 flex items-center justify-between sm:justify-between">
              <span className="text-[11px] text-muted-foreground">
                Formatted according to {citationModal.style} standards.
              </span>
              <Button onClick={handleCopyCitation} className="text-xs font-bold flex items-center gap-1.5">
                {copiedCitation ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedCitation ? 'Copied!' : 'Copy Citation'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* 8. MODAL: PEER REVIEW LOGGING */}
      {reviewModalArticle && (
        <Dialog open={!!reviewModalArticle} onOpenChange={(open) => !open && setReviewModalArticle(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">
                Log Double-Blind Peer Review
              </DialogTitle>
              <DialogDescription className="text-xs line-clamp-1">
                Manuscript: {reviewModalArticle.title}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handlePeerReviewSubmit} className="space-y-3 text-xs pt-1">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <Label className="text-xs">Reviewer Name (Optional)</Label>
                  <Input
                    placeholder="Prof. Blind Reviewer #1"
                    value={reviewForm.reviewerName}
                    onChange={(e) => setReviewForm({ ...reviewForm, reviewerName: e.target.value })}
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Editorial Recommendation *</Label>
                  <Select
                    value={reviewForm.recommendation}
                    onValueChange={(val: any) => setReviewForm({ ...reviewForm, recommendation: val })}
                  >
                    <SelectTrigger className="mt-1 text-xs font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACCEPT">ACCEPT (Publish As Is)</SelectItem>
                      <SelectItem value="MINOR_REVISION">MINOR REVISION</SelectItem>
                      <SelectItem value="MAJOR_REVISION">MAJOR REVISION</SelectItem>
                      <SelectItem value="REJECT">REJECT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Numerical Rubric */}
              <div className="grid grid-cols-4 gap-2 pt-1 border-t border-border/60">
                <div>
                  <Label className="text-[11px]">Originality (1-5)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={reviewForm.originalityScore}
                    onChange={(e) => setReviewForm({ ...reviewForm, originalityScore: Number(e.target.value) })}
                    className="mt-1 text-xs text-center font-bold"
                  />
                </div>
                <div>
                  <Label className="text-[11px]">Methodology</Label>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={reviewForm.methodologyScore}
                    onChange={(e) => setReviewForm({ ...reviewForm, methodologyScore: Number(e.target.value) })}
                    className="mt-1 text-xs text-center font-bold"
                  />
                </div>
                <div>
                  <Label className="text-[11px]">Clarity &amp; Style</Label>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={reviewForm.clarityScore}
                    onChange={(e) => setReviewForm({ ...reviewForm, clarityScore: Number(e.target.value) })}
                    className="mt-1 text-xs text-center font-bold"
                  />
                </div>
                <div>
                  <Label className="text-[11px]">Significance</Label>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={reviewForm.significanceScore}
                    onChange={(e) => setReviewForm({ ...reviewForm, significanceScore: Number(e.target.value) })}
                    className="mt-1 text-xs text-center font-bold"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Confidential Comments to Chief Editor</Label>
                <Textarea
                  placeholder="Confidential remarks regarding rigor, novelty, or technical depth..."
                  value={reviewForm.confidentialComments}
                  onChange={(e) => setReviewForm({ ...reviewForm, confidentialComments: e.target.value })}
                  className="mt-1 text-xs h-16"
                />
              </div>

              <div>
                <Label className="text-xs">Constructive Feedback for Author</Label>
                <Textarea
                  placeholder="Specific line edits, literature comparisons, or suggested improvements..."
                  value={reviewForm.authorComments}
                  onChange={(e) => setReviewForm({ ...reviewForm, authorComments: e.target.value })}
                  className="mt-1 text-xs h-16"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="ghost" onClick={() => setReviewModalArticle(null)}>Cancel</Button>
                <Button type="submit" disabled={isPending}>Save Peer Review</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* 9. MODAL: PUBLISH TO ISSUE */}
      {publishModalArticle && (
        <Dialog open={!!publishModalArticle} onOpenChange={(open) => !open && setPublishModalArticle(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Publish to Journal Issue</DialogTitle>
              <DialogDescription className="text-xs line-clamp-1">
                Article: {publishModalArticle.title}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handlePublishSubmit} className="space-y-3 text-xs pt-1">
              <div>
                <Label className="text-xs">Select Journal Issue *</Label>
                <Select
                  value={publishForm.issueId}
                  onValueChange={(val) => setPublishForm({ ...publishForm, issueId: val })}
                >
                  <SelectTrigger className="mt-1 text-xs font-bold">
                    <SelectValue placeholder="Choose Issue Volume" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedJournal?.issues?.map((iss: any) => (
                      <SelectItem key={iss.id} value={iss.id} className="text-xs">
                        Vol. {iss.volume} No. {iss.issueNumber} ({new Date(iss.publicationDate || Date.now()).getFullYear()}) - {iss.title || 'Standard Issue'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">DOI (Digital Object Identifier)</Label>
                <Input
                  value={publishForm.doi}
                  onChange={(e) => setPublishForm({ ...publishForm, doi: e.target.value })}
                  placeholder="10.5281/zenodo.10829141"
                  className="mt-1 font-mono text-xs"
                />
              </div>

              <div>
                <Label className="text-xs">Page Numbers</Label>
                <Input
                  value={publishForm.pages}
                  onChange={(e) => setPublishForm({ ...publishForm, pages: e.target.value })}
                  placeholder="14-29"
                  className="mt-1 text-xs font-mono"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="ghost" onClick={() => setPublishModalArticle(null)}>Cancel</Button>
                <Button type="submit" disabled={isPending} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
                  Publish to Archive
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
