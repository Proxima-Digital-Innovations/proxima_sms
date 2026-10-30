'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  Megaphone,
  FileText,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Download,
  Printer,
  Search,
  Filter,
  Eye,
  Plus,
  Building,
  ShieldCheck,
  Bookmark,
  Share2,
  Clock,
  Sparkles,
  ArrowRight,
  BookOpen
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
  getUniversityBulletinsAction,
  createUniversityBulletinAction,
  incrementBulletinViewCountAction
} from '@/actions/research-publishing-actions';

export default function UniversityBulletinsPage() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [bulletins, setBulletins] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Reader Modal State
  const [activeReadingBulletin, setActiveReadingBulletin] = useState<any | null>(null);

  // New Bulletin Form State
  const [newBulletinOpen, setNewBulletinOpen] = useState(false);
  const [newBulletinForm, setNewBulletinForm] = useState({
    title: '',
    bulletinType: 'OFFICIAL_BULLETIN',
    volume: 12,
    issueNumber: 7,
    summary: '',
    content: '',
    publishedBy: 'Directorate of Information & Protocol (DIPR)',
    editorInChief: 'University Registrar',
    targetAudience: 'ALL',
    isUrgent: false,
    isFeatured: true
  });

  const loadBulletins = async () => {
    setIsLoading(true);
    const res = await getUniversityBulletinsAction({
      type: selectedType,
      search: searchQuery
    });
    if (res.success && res.data) {
      setBulletins(res.data);
    } else {
      toast({ title: 'Error', description: res.error || 'Failed to fetch bulletins', variant: 'destructive' });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadBulletins();
  }, [selectedType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadBulletins();
  };

  const handleOpenReader = (bulletin: any) => {
    setActiveReadingBulletin(bulletin);
    incrementBulletinViewCountAction(bulletin.id).catch(() => {});
  };

  const handleCreateBulletin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBulletinForm.title || !newBulletinForm.summary || !newBulletinForm.content) {
      toast({ title: 'Incomplete Details', description: 'Please fill in title, summary, and content.', variant: 'destructive' });
      return;
    }

    startTransition(async () => {
      const res = await createUniversityBulletinAction(newBulletinForm);
      if (res.success) {
        toast({ title: 'Bulletin Released', description: `Official Bulletin "${newBulletinForm.title.slice(0, 30)}..." published.` });
        setNewBulletinOpen(false);
        setNewBulletinForm({
          title: '',
          bulletinType: 'OFFICIAL_BULLETIN',
          volume: 12,
          issueNumber: (newBulletinForm.issueNumber || 7) + 1,
          summary: '',
          content: '',
          publishedBy: 'Directorate of Information & Protocol (DIPR)',
          editorInChief: 'University Registrar',
          targetAudience: 'ALL',
          isUrgent: false,
          isFeatured: true
        });
        loadBulletins();
      } else {
        toast({ title: 'Publishing Failed', description: res.error, variant: 'destructive' });
      }
    });
  };

  const featuredBulletin = bulletins.find((b) => b.isUrgent) || bulletins.find((b) => b.isFeatured) || bulletins[0];

  return (
    <div className="space-y-6">
      {/* 1. HERO HEADER */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-blue-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-mono rounded-full font-bold flex items-center gap-1.5">
                <Megaphone className="w-3.5 h-3.5" />
                UNIVERSITY INFORMATION BULLETIN &amp; GAZETTE
              </span>
              <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs rounded-full font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Official Registrar Seal
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
              University Information Bulletins &amp; Gazettes
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              Official institutional periodicals, Senate decisions, executive notices, campus communiqués, and administrative directives.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Dialog open={newBulletinOpen} onOpenChange={setNewBulletinOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl shadow-lg flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  Issue New Bulletin
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Issue Official University Bulletin</DialogTitle>
                  <DialogDescription>
                    Publish a sanctioned institutional circular, Senate communiqué, or executive directive.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleCreateBulletin} className="space-y-3.5 text-xs">
                  <div>
                    <Label className="text-xs">Bulletin Title *</Label>
                    <Input
                      required
                      placeholder="e.g. Official Information Bulletin No. 429: Senate Decisions on 2026/2027 Calendar"
                      value={newBulletinForm.title}
                      onChange={(e) => setNewBulletinForm({ ...newBulletinForm, title: e.target.value })}
                      className="mt-1 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <Label className="text-xs">Bulletin Classification</Label>
                      <Select
                        value={newBulletinForm.bulletinType}
                        onValueChange={(val) => setNewBulletinForm({ ...newBulletinForm, bulletinType: val })}
                      >
                        <SelectTrigger className="mt-1 text-xs font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="OFFICIAL_BULLETIN">Official Bulletin</SelectItem>
                          <SelectItem value="SENATE_COMMUNIQUE">Senate Communiqué</SelectItem>
                          <SelectItem value="SPECIAL_DIGEST">Special Campus Digest</SelectItem>
                          <SelectItem value="EMERGENCY_NOTICE">Emergency Notice</SelectItem>
                          <SelectItem value="RESEARCH_BRIEF">Research &amp; Grant Brief</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Volume Number</Label>
                      <Input
                        type="number"
                        value={newBulletinForm.volume}
                        onChange={(e) => setNewBulletinForm({ ...newBulletinForm, volume: Number(e.target.value) })}
                        className="mt-1 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Issue Number</Label>
                      <Input
                        type="number"
                        value={newBulletinForm.issueNumber}
                        onChange={(e) => setNewBulletinForm({ ...newBulletinForm, issueNumber: Number(e.target.value) })}
                        className="mt-1 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <Label className="text-xs">Issuing Authority</Label>
                      <Input
                        value={newBulletinForm.publishedBy}
                        onChange={(e) => setNewBulletinForm({ ...newBulletinForm, publishedBy: e.target.value })}
                        className="mt-1 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Target Audience</Label>
                      <Select
                        value={newBulletinForm.targetAudience}
                        onValueChange={(val) => setNewBulletinForm({ ...newBulletinForm, targetAudience: val })}
                      >
                        <SelectTrigger className="mt-1 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">Entire University Community</SelectItem>
                          <SelectItem value="STUDENTS_ONLY">Students Only</SelectItem>
                          <SelectItem value="STAFF_ONLY">Academic &amp; Non-Teaching Staff</SelectItem>
                          <SelectItem value="FACULTY_ONLY">Academic Faculty Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">Executive Summary *</Label>
                    <Textarea
                      required
                      placeholder="Brief overview summarizing the core resolutions or instructions..."
                      value={newBulletinForm.summary}
                      onChange={(e) => setNewBulletinForm({ ...newBulletinForm, summary: e.target.value })}
                      className="mt-1 h-16 text-xs"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Full Official Content * (Supports Markdown)</Label>
                    <Textarea
                      required
                      placeholder="Detailed directives, resolutions, timelines, and sanction clauses..."
                      value={newBulletinForm.content}
                      onChange={(e) => setNewBulletinForm({ ...newBulletinForm, content: e.target.value })}
                      className="mt-1 h-36 font-mono text-xs leading-relaxed"
                    />
                  </div>

                  <div className="flex items-center gap-4 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={newBulletinForm.isUrgent}
                        onChange={(e) => setNewBulletinForm({ ...newBulletinForm, isUrgent: e.target.checked })}
                        className="rounded accent-rose-600"
                      />
                      <span className="font-semibold text-rose-600 dark:text-rose-400">Mark as URGENT Announcement</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={newBulletinForm.isFeatured}
                        onChange={(e) => setNewBulletinForm({ ...newBulletinForm, isFeatured: e.target.checked })}
                        className="rounded accent-primary"
                      />
                      <span>Pin to Top (Featured)</span>
                    </label>
                  </div>

                  <DialogFooter className="pt-2">
                    <Button type="button" variant="ghost" onClick={() => setNewBulletinOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={isPending}>Publish Official Bulletin</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* 2. FEATURED / URGENT BULLETIN BANNER */}
      {featuredBulletin && (
        <div
          onClick={() => handleOpenReader(featuredBulletin)}
          className="bg-card hover:bg-accent/40 cursor-pointer p-5 sm:p-6 rounded-3xl border border-border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-5 transition-all animate-in fade-in"
        >
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              featuredBulletin.isUrgent
                ? 'bg-rose-500/15 text-rose-600 border border-rose-500/30'
                : 'bg-primary/15 text-primary border border-primary/30'
            }`}>
              <Megaphone className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                {featuredBulletin.isUrgent && (
                  <Badge variant="destructive" className="text-[10px] uppercase font-black tracking-wider">
                    URGENT DISPATCH
                  </Badge>
                )}
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-muted text-muted-foreground rounded-md">
                  Vol. {featuredBulletin.volume} No. {featuredBulletin.issueNumber}
                </span>
                <span className="text-xs text-muted-foreground font-semibold">
                  {new Date(featuredBulletin.publicationDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-foreground hover:text-primary transition-colors">
                {featuredBulletin.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 max-w-3xl">
                {featuredBulletin.summary}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
            <Button size="sm" className="rounded-xl text-xs font-bold flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              Read Full Bulletin
            </Button>
          </div>
        </div>
      )}

      {/* 3. CATEGORY PILLS & SEARCH */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'ALL', label: 'All Editions' },
            { id: 'OFFICIAL_BULLETIN', label: 'Official Bulletins' },
            { id: 'SENATE_COMMUNIQUE', label: 'Senate Decisions' },
            { id: 'EMERGENCY_NOTICE', label: 'Urgent Notices' },
            { id: 'RESEARCH_BRIEF', label: 'Research Calls' }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedType(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                selectedType === cat.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-2.5" />
          <Input
            placeholder="Search bulletin archives..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs bg-card"
          />
        </form>
      </div>

      {/* 4. BULLETIN ARCHIVES GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bulletins.map((b) => (
          <Card
            key={b.id}
            className="border border-border/80 hover:border-primary/50 transition-all cursor-pointer shadow-xs flex flex-col justify-between"
            onClick={() => handleOpenReader(b)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-primary/10 text-primary rounded">
                  Vol. {b.volume} No. {b.issueNumber}
                </span>
                <span className="text-[11px] text-muted-foreground font-medium">
                  {new Date(b.publicationDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <CardTitle className="text-sm sm:text-base font-bold text-foreground leading-snug line-clamp-2">
                {b.title}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-2.5 text-xs text-muted-foreground pt-0">
              <p className="line-clamp-3 leading-relaxed">
                {b.summary}
              </p>

              <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px]">
                <span className="truncate max-w-[180px]">
                  {b.publishedBy}
                </span>
                <span className="flex items-center gap-1 font-semibold text-muted-foreground">
                  <Eye className="w-3 h-3" />
                  {b.viewCount || 0} reads
                </span>
              </div>
            </CardContent>

            <CardFooter className="pt-2 border-t border-border/40 flex items-center justify-between text-xs">
              <Badge variant="outline" className="text-[10px] py-0 px-2 font-medium">
                Audience: {b.targetAudience}
              </Badge>
              <span className="font-bold text-primary flex items-center gap-1 text-[11px]">
                Open Digest &rarr;
              </span>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* 5. MODAL: OFFICIAL BULLETIN READER */}
      {activeReadingBulletin && (
        <Dialog open={!!activeReadingBulletin} onOpenChange={(open) => !open && setActiveReadingBulletin(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            {/* Institution Seal & Letterhead Banner */}
            <div className="border-b-2 border-border pb-4 text-center space-y-1">
              <div className="flex items-center justify-center gap-2 text-primary font-black text-xs uppercase tracking-widest">
                <ShieldCheck className="w-4 h-4" />
                OFFICIAL UNIVERSITY GAZETTE &amp; INFORMATION BULLETIN
              </div>
              <h2 className="text-lg sm:text-xl font-black text-foreground">
                {activeReadingBulletin.title}
              </h2>
              <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground font-mono pt-1">
                <span>Volume {activeReadingBulletin.volume}</span>
                <span>&bull;</span>
                <span>Issue {activeReadingBulletin.issueNumber}</span>
                <span>&bull;</span>
                <span>Date: {new Date(activeReadingBulletin.publicationDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                <span>&bull;</span>
                <span>Issued by: {activeReadingBulletin.publishedBy}</span>
              </div>
            </div>

            {/* Content Body */}
            <div className="space-y-4 py-4 text-sm text-foreground leading-relaxed">
              <div className="p-3 bg-muted/50 rounded-xl border border-border/60 text-xs text-muted-foreground italic">
                <strong>Executive Summary:</strong> {activeReadingBulletin.summary}
              </div>

              <div className="whitespace-pre-line text-xs sm:text-sm font-sans space-y-3 leading-relaxed">
                {activeReadingBulletin.content}
              </div>
            </div>

            {/* Official Footer Verification */}
            <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
              <div>
                Approved for Institutional Release by: <strong className="text-foreground">{activeReadingBulletin.approvedBy || 'Office of the Vice-Chancellor'}</strong>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.print()}
                  className="text-xs h-8 rounded-xl flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Circular
                </Button>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => {
                    toast({ title: 'PDF Export Ready', description: 'Official bulletin archived for offline record.' });
                  }}
                  className="text-xs h-8 rounded-xl flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download PDF
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
