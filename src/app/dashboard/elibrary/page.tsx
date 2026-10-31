'use client';

import { useState, useEffect, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  getELibraryBooks,
  getELibraryTaxonomyAction,
  createELibraryBook,
  borrowELibraryBook,
  seedSampleELibraryCatalogAction,
} from '@/actions/elibrary-actions';
import {
  BookOpen,
  Plus,
  Search,
  Bookmark,
  ExternalLink,
  GraduationCap,
  Layers,
  FileText,
  Filter,
  Sparkles,
  RotateCcw,
  BookMarked,
  Library,
} from 'lucide-react';

export default function ELibraryPage() {
  const [books, setBooks] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [department, setDepartment] = useState('ALL');
  const [subject, setSubject] = useState('ALL');
  const [resourceType, setResourceType] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const [taxonomy, setTaxonomy] = useState<{
    departments: string[];
    subjects: string[];
    categories: string[];
    resourceTypes: { id: string; label: string }[];
  }>({
    departments: [],
    subjects: [],
    categories: [],
    resourceTypes: [],
  });

  const [form, setForm] = useState({
    title: '',
    author: '',
    category: 'Sciences & Computing',
    department: 'Computer Science',
    subject: 'Operating Systems',
    resourceType: 'TEXTBOOK',
    isbn: '',
    edition: '1st Edition',
    description: '',
    fileUrl: '',
    totalCopies: 5,
    isDigital: true,
  });

  const loadTaxonomy = async () => {
    const res = await getELibraryTaxonomyAction();
    if (res.success && res.data) {
      setTaxonomy(res.data);
    }
  };

  const loadBooks = async () => {
    setIsLoading(true);
    const res = await getELibraryBooks({
      category: category === 'ALL' ? undefined : category,
      department: department === 'ALL' ? undefined : department,
      subject: subject === 'ALL' ? undefined : subject,
      resourceType: resourceType === 'ALL' ? undefined : resourceType,
      query: search,
    });
    if (res.success && res.data) {
      setBooks(res.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadTaxonomy();
  }, []);

  useEffect(() => {
    loadBooks();
  }, [category, department, subject, resourceType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadBooks();
  };

  const handleResetFilters = () => {
    setSearch('');
    setCategory('ALL');
    setDepartment('ALL');
    setSubject('ALL');
    setResourceType('ALL');
  };

  const handleCreateBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.author) return;

    startTransition(async () => {
      const res = await createELibraryBook(form);
      if (res.success) {
        toast({
          title: 'Resource Cataloged',
          description: `"${form.title}" categorized under ${form.department} / ${form.subject}.`,
        });
        setIsDialogOpen(false);
        setForm({
          title: '',
          author: '',
          category: 'Sciences & Computing',
          department: 'Computer Science',
          subject: 'Operating Systems',
          resourceType: 'TEXTBOOK',
          isbn: '',
          edition: '1st Edition',
          description: '',
          fileUrl: '',
          totalCopies: 5,
          isDigital: true,
        });
        loadBooks();
        loadTaxonomy();
      } else {
        toast({ title: 'Failed to Add Resource', description: res.error, variant: 'destructive' });
      }
    });
  };

  const handleBorrow = (bookId: string, title: string) => {
    startTransition(async () => {
      const res = await borrowELibraryBook({ bookId, userId: 'current-user-id', durationDays: 14 });
      if (res.success) {
        toast({ title: 'Loan Approved', description: `14-day checkout granted for "${title}".` });
        loadBooks();
      } else {
        toast({ title: 'Loan Request Rejected', description: res.error, variant: 'destructive' });
      }
    });
  };

  const handleSeedCatalog = () => {
    startTransition(async () => {
      const res = await seedSampleELibraryCatalogAction();
      if (res.success) {
        toast({ title: 'Catalog Populated', description: 'Sample academic resources categorized by department and subject.' });
        loadBooks();
        loadTaxonomy();
      } else {
        toast({ title: 'Seed Failed', description: res.error, variant: 'destructive' });
      }
    });
  };

  const getResourceTypeBadge = (type?: string | null) => {
    switch (type) {
      case 'PAST_QUESTION':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[11px]">Past Exam Paper</Badge>;
      case 'JOURNAL_ARTICLE':
        return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20 text-[11px]">Journal Article</Badge>;
      case 'LECTURE_MANUAL':
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[11px]">Lecture Manual</Badge>;
      case 'THESIS_DISSERTATION':
        return <Badge className="bg-cyan-500/10 text-cyan-600 border-cyan-500/20 text-[11px]">Thesis / Monograph</Badge>;
      case 'TEXTBOOK':
      default:
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[11px]">Core Textbook</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card border border-border p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Library className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Institutional e-Library & Research Repository
            </h1>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Categorized academic repository organized hierarchically by Faculty/Discipline, Academic Department, and Subject/Course.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSeedCatalog}
            disabled={isPending}
            className="rounded-xl border-dashed"
          >
            <Sparkles className="h-4 w-4 mr-1.5 text-amber-500" />
            Seed Sample Holdings
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl shadow-sm">
                <Plus className="h-4 w-4 mr-2" /> Catalog New Resource
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl rounded-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Catalog Resource into Library Taxonomy</DialogTitle>
                <DialogDescription>
                  Index books, course materials, past examination questions, or theses classified by Department and Subject.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateBook} className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="bk-title">Resource / Book Title</Label>
                  <Input
                    id="bk-title"
                    placeholder="e.g. Modern Operating Systems & Concurrency"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="bk-author">Author(s) / Originator</Label>
                    <Input
                      id="bk-author"
                      placeholder="e.g. Andrew S. Tanenbaum"
                      value={form.author}
                      onChange={(e) => setForm({ ...form, author: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="bk-res-type">Resource Type</Label>
                    <Select
                      value={form.resourceType}
                      onValueChange={(val) => setForm({ ...form, resourceType: val })}
                    >
                      <SelectTrigger id="bk-res-type">
                        <SelectValue placeholder="Resource Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TEXTBOOK">Textbook / Core Reading</SelectItem>
                        <SelectItem value="PAST_QUESTION">Past Exam Paper / Solution</SelectItem>
                        <SelectItem value="JOURNAL_ARTICLE">Journal Article / Pre-print</SelectItem>
                        <SelectItem value="THESIS_DISSERTATION">Thesis / Dissertation</SelectItem>
                        <SelectItem value="LECTURE_MANUAL">Lecture Note / Lab Manual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Classification Taxonomy */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-muted/40 rounded-xl border border-border/60">
                  <div className="space-y-1.5">
                    <Label htmlFor="bk-cat" className="text-xs font-semibold">
                      1. Discipline / Faculty
                    </Label>
                    <Select
                      value={form.category}
                      onValueChange={(val) => setForm({ ...form, category: val })}
                    >
                      <SelectTrigger id="bk-cat" className="text-xs h-9">
                        <SelectValue placeholder="Discipline" />
                      </SelectTrigger>
                      <SelectContent>
                        {(taxonomy.categories.length > 0
                          ? taxonomy.categories
                          : [
                              'Sciences & Computing',
                              'Engineering & Technology',
                              'Health & Medical Sciences',
                              'Law & Legal Studies',
                              'Business & Management Sciences',
                              'Arts, Humanities & Education',
                            ]
                        ).map((c) => (
                          <SelectItem key={c} value={c} className="text-xs">
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="bk-dept" className="text-xs font-semibold">
                      2. Academic Department
                    </Label>
                    <Select
                      value={form.department}
                      onValueChange={(val) => setForm({ ...form, department: val })}
                    >
                      <SelectTrigger id="bk-dept" className="text-xs h-9">
                        <SelectValue placeholder="Select Department" />
                      </SelectTrigger>
                      <SelectContent>
                        {taxonomy.departments.map((d) => (
                          <SelectItem key={d} value={d} className="text-xs">
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="bk-sub" className="text-xs font-semibold">
                      3. Subject / Course
                    </Label>
                    <Select
                      value={form.subject}
                      onValueChange={(val) => setForm({ ...form, subject: val })}
                    >
                      <SelectTrigger id="bk-sub" className="text-xs h-9">
                        <SelectValue placeholder="Select Subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {taxonomy.subjects.map((s) => (
                          <SelectItem key={s} value={s} className="text-xs">
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="bk-isbn">ISBN / Catalog Code (Optional)</Label>
                    <Input
                      id="bk-isbn"
                      placeholder="e.g. 978-0131429383"
                      value={form.isbn}
                      onChange={(e) => setForm({ ...form, isbn: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="bk-edition">Edition / Year</Label>
                    <Input
                      id="bk-edition"
                      placeholder="e.g. 10th Global Edition"
                      value={form.edition}
                      onChange={(e) => setForm({ ...form, edition: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="bk-copies">Total Physical Holdings</Label>
                    <Input
                      id="bk-copies"
                      type="number"
                      min={1}
                      value={form.totalCopies}
                      onChange={(e) => setForm({ ...form, totalCopies: Number(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="bk-url">Digital PDF Link / Repository URL</Label>
                    <Input
                      id="bk-url"
                      placeholder="https://..."
                      value={form.fileUrl}
                      onChange={(e) => setForm({ ...form, fileUrl: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bk-desc">Abstract / Course Syllabus Scope</Label>
                  <Input
                    id="bk-desc"
                    placeholder="Brief description of the material, curriculum relevance, or past exam coverage..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>

                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? 'Cataloging...' : 'Save & Publish to Repository'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Multi-tier Filter Panel */}
      <Card className="border border-border bg-card rounded-2xl shadow-sm p-4 space-y-4">
        {/* Resource Type Filter Tabs */}
        <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-border/50">
          <Tabs
            value={resourceType}
            onValueChange={setResourceType}
            className="w-full sm:w-auto"
          >
            <TabsList className="bg-muted/70 p-1 rounded-xl">
              <TabsTrigger value="ALL" className="text-xs rounded-lg">All Holdings</TabsTrigger>
              <TabsTrigger value="TEXTBOOK" className="text-xs rounded-lg">Textbooks</TabsTrigger>
              <TabsTrigger value="PAST_QUESTION" className="text-xs rounded-lg">Past Exam Questions</TabsTrigger>
              <TabsTrigger value="JOURNAL_ARTICLE" className="text-xs rounded-lg">Research Articles</TabsTrigger>
              <TabsTrigger value="LECTURE_MANUAL" className="text-xs rounded-lg">Lecture Notes</TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetFilters}
            className="text-xs text-muted-foreground hover:text-foreground h-8"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Reset All Filters
          </Button>
        </div>

        {/* Search & Dynamic Select Filters */}
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search title, author, ISBN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-xl h-10 text-xs"
            />
          </div>

          {/* Discipline / Category Filter */}
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="rounded-xl h-10 text-xs">
              <div className="flex items-center gap-1.5 truncate">
                <Layers className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <SelectValue placeholder="Discipline" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs font-semibold">All Disciplines</SelectItem>
              {taxonomy.categories.map((c) => (
                <SelectItem key={c} value={c} className="text-xs">
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Department Filter */}
          <Select value={department} onValueChange={setDepartment}>
            <SelectTrigger className="rounded-xl h-10 text-xs">
              <div className="flex items-center gap-1.5 truncate">
                <GraduationCap className="h-3.5 w-3.5 text-primary shrink-0" />
                <SelectValue placeholder="Department" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs font-semibold">All Departments</SelectItem>
              {taxonomy.departments.map((d) => (
                <SelectItem key={d} value={d} className="text-xs">
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Subject Filter */}
          <Select value={subject} onValueChange={setSubject}>
            <SelectTrigger className="rounded-xl h-10 text-xs">
              <div className="flex items-center gap-1.5 truncate">
                <BookMarked className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <SelectValue placeholder="Subject / Course" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs font-semibold">All Subjects</SelectItem>
              {taxonomy.subjects.map((s) => (
                <SelectItem key={s} value={s} className="text-xs">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </form>

        {/* Active Filter Summary Badges */}
        {(category !== 'ALL' || department !== 'ALL' || subject !== 'ALL' || resourceType !== 'ALL' || search) && (
          <div className="flex items-center gap-2 flex-wrap pt-1 text-xs text-muted-foreground">
            <span className="font-medium">Active filters:</span>
            {department !== 'ALL' && (
              <Badge variant="secondary" className="text-[11px] gap-1">
                Dept: {department}
              </Badge>
            )}
            {subject !== 'ALL' && (
              <Badge variant="secondary" className="text-[11px] gap-1">
                Subject: {subject}
              </Badge>
            )}
            {category !== 'ALL' && (
              <Badge variant="secondary" className="text-[11px] gap-1">
                Faculty: {category}
              </Badge>
            )}
            {resourceType !== 'ALL' && (
              <Badge variant="secondary" className="text-[11px] gap-1">
                Type: {resourceType}
              </Badge>
            )}
            {search && (
              <Badge variant="secondary" className="text-[11px] gap-1">
                Keyword: "{search}"
              </Badge>
            )}
          </div>
        )}
      </Card>

      {/* Book Catalog Grid */}
      {books.length === 0 && !isLoading ? (
        <Card className="border border-dashed border-border bg-card/50 rounded-2xl p-12 text-center">
          <Library className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground">No resources match your filter criteria</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1 mb-4">
            Try adjusting your Department, Subject, or Discipline filters, or seed the library with standard academic textbooks.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" size="sm" onClick={handleResetFilters} className="rounded-xl">
              Reset Filters
            </Button>
            <Button size="sm" onClick={handleSeedCatalog} className="rounded-xl">
              <Sparkles className="h-4 w-4 mr-1.5" /> Seed Academic Materials
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {books.map((b) => (
            <Card
              key={b.id}
              className="border border-border bg-card rounded-2xl shadow-sm hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {getResourceTypeBadge(b.resourceType)}
                    {b.department && (
                      <Badge variant="outline" className="font-medium text-[11px] text-primary border-primary/20 bg-primary/5">
                        {b.department}
                      </Badge>
                    )}
                  </div>
                  <Badge
                    className={
                      b.isDigital
                        ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20 text-[11px]'
                        : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[11px]'
                    }
                  >
                    {b.isDigital
                      ? 'e-Book / PDF'
                      : `${b.availableCopies}/${b.totalCopies} Copies Left`}
                  </Badge>
                </div>

                <CardTitle className="text-base font-bold text-foreground mt-2 line-clamp-2">
                  {b.title}
                </CardTitle>

                <CardDescription className="text-xs">
                  By <span className="font-semibold text-foreground">{b.author}</span>
                  {b.edition ? ` • ${b.edition}` : ''}
                </CardDescription>

                {/* Subject & Category Meta Tag */}
                <div className="flex items-center gap-1.5 pt-1 text-[11px] text-muted-foreground flex-wrap">
                  {b.subject && (
                    <span className="inline-flex items-center gap-1 font-medium text-foreground bg-muted px-2 py-0.5 rounded-md">
                      <BookMarked className="h-3 w-3 text-emerald-600" />
                      {b.subject}
                    </span>
                  )}
                  {b.category && (
                    <span className="text-muted-foreground">
                      ({b.category})
                    </span>
                  )}
                </div>
              </CardHeader>

              <CardContent className="pt-0 pb-4 text-xs text-muted-foreground line-clamp-3">
                {b.description || 'Standard institutional reading and reference material registered in the catalog repository.'}
              </CardContent>

              <CardFooter className="pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl flex-1 text-xs"
                  onClick={() => handleBorrow(b.id, b.title)}
                  disabled={isPending || (!b.isDigital && b.availableCopies <= 0)}
                >
                  <Bookmark className="h-3.5 w-3.5 mr-1 text-primary" />
                  Borrow / Loan
                </Button>

                {b.fileUrl ? (
                  <Button
                    size="sm"
                    className="rounded-xl flex-1 text-xs"
                    onClick={() => window.open(b.fileUrl, '_blank')}
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1" />
                    Read Digital
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="rounded-xl flex-1 text-xs cursor-default"
                    disabled
                  >
                    Physical Reserve Only
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
