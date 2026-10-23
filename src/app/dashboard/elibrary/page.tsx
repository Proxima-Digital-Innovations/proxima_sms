'use client';

import { useState, useEffect, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getELibraryBooks, createELibraryBook, borrowELibraryBook } from '@/actions/elibrary-actions';
import { BookOpen, Plus, Search, BookCopy, Download, ExternalLink, CheckCircle2, Bookmark, Loader2 } from 'lucide-react';

export default function ELibraryPage() {
  const [books, setBooks] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const [form, setForm] = useState({
    title: '',
    author: '',
    category: 'Computer Science',
    isbn: '',
    edition: '1st Edition',
    description: '',
    fileUrl: '',
    totalCopies: 5,
    isDigital: true,
  });

  const loadBooks = async () => {
    setIsLoading(true);
    const res = await getELibraryBooks(category, search);
    if (res.success && res.data) {
      setBooks(res.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadBooks();
  }, [category]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadBooks();
  };

  const handleCreateBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.author) return;

    startTransition(async () => {
      const res = await createELibraryBook(form);
      if (res.success) {
        toast({ title: 'Resource Added', description: `${form.title} added to the digital catalog.` });
        setIsDialogOpen(false);
        setForm({ title: '', author: '', category: 'Computer Science', isbn: '', edition: '1st Edition', description: '', fileUrl: '', totalCopies: 5, isDigital: true });
        loadBooks();
      } else {
        toast({ title: 'Failed to Add Resource', description: res.error, variant: 'destructive' });
      }
    });
  };

  const handleBorrow = (bookId: string, title: string) => {
    startTransition(async () => {
      const res = await borrowELibraryBook({ bookId, userId: 'current-user-id', durationDays: 14 });
      if (res.success) {
        toast({ title: 'Loan Confirmed', description: `14-day checkout granted for "${title}".` });
        loadBooks();
      } else {
        toast({ title: 'Borrow Request Rejected', description: res.error, variant: 'destructive' });
      }
    });
  };

  // Seed default demo books if empty
  const displayBooks = books.length > 0 ? books : [
    {
      id: 'b-1',
      title: 'Introduction to Algorithms (4th Edition)',
      author: 'Thomas H. Cormen, Charles E. Leiserson',
      category: 'Computer Science',
      isbn: '978-0262046305',
      edition: '4th Edition',
      description: 'Comprehensive reference on contemporary algorithms, data structures, and computational complexity.',
      availableCopies: 8,
      totalCopies: 10,
      isDigital: true,
      fileUrl: 'https://example.com/books/algorithms.pdf',
    },
    {
      id: 'b-2',
      title: 'Operating System Concepts (Silberschatz)',
      author: 'Abraham Silberschatz, Peter B. Galvin',
      category: 'Computer Science',
      isbn: '978-1119800361',
      edition: '10th Edition',
      description: 'Fundamental principles of process scheduling, virtual memory, concurrency, and distributed architectures.',
      availableCopies: 4,
      totalCopies: 5,
      isDigital: true,
      fileUrl: 'https://example.com/books/os.pdf',
    },
    {
      id: 'b-3',
      title: 'Engineering Mathematics (8th Edition)',
      author: 'K.A. Stroud, Dexter J. Booth',
      category: 'Engineering',
      isbn: '978-1352010275',
      edition: '8th Edition',
      description: 'Programmed foundational mathematics covering differential equations, linear algebra, and Fourier series.',
      availableCopies: 2,
      totalCopies: 6,
      isDigital: false,
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card border border-border p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">e-Library & Research Repository</h1>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Access digital textbooks, past examination papers, journal articles, and physical reserve circulation.
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl shadow-sm">
              <Plus className="h-4 w-4 mr-2" /> Add Library Resource
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle>Add Resource to Catalog</DialogTitle>
              <DialogDescription>
                Upload digital PDF or register physical holding copies for circulation.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateBook} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="bk-title">Resource / Book Title</Label>
                <Input
                  id="bk-title"
                  placeholder="e.g. Modern Operating Systems"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bk-author">Author(s)</Label>
                <Input
                  id="bk-author"
                  placeholder="e.g. Andrew S. Tanenbaum"
                  value={form.author}
                  onChange={(e) => setForm({ ...form, author: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="bk-cat">Discipline Category</Label>
                  <Select
                    value={form.category}
                    onValueChange={(val) => setForm({ ...form, category: val })}
                  >
                    <SelectTrigger id="bk-cat">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Computer Science">Computer Science</SelectItem>
                      <SelectItem value="Engineering">Engineering</SelectItem>
                      <SelectItem value="Medicine">Medicine & Health</SelectItem>
                      <SelectItem value="Sciences">Natural Sciences</SelectItem>
                      <SelectItem value="Law">Law & Jurisprudence</SelectItem>
                      <SelectItem value="General">General / Past Questions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bk-copies">Total Holdings</Label>
                  <Input
                    id="bk-copies"
                    type="number"
                    min={1}
                    value={form.totalCopies}
                    onChange={(e) => setForm({ ...form, totalCopies: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bk-url">Digital PDF / Access Link (Optional)</Label>
                <Input
                  id="bk-url"
                  placeholder="https://..."
                  value={form.fileUrl}
                  onChange={(e) => setForm({ ...form, fileUrl: e.target.value })}
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Cataloging...' : 'Add to Catalog'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter / Search Bar */}
      <Card className="border border-border bg-card rounded-2xl shadow-sm p-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title, author, or ISBN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-xl h-10"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full sm:w-56 rounded-xl h-10">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Disciplines</SelectItem>
              <SelectItem value="Computer Science">Computer Science</SelectItem>
              <SelectItem value="Engineering">Engineering</SelectItem>
              <SelectItem value="Medicine">Medicine & Health</SelectItem>
              <SelectItem value="Sciences">Natural Sciences</SelectItem>
              <SelectItem value="Law">Law & Jurisprudence</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" className="rounded-xl h-10">Search</Button>
        </form>
      </Card>

      {/* Book Catalog Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayBooks.map((b) => (
          <Card key={b.id} className="border border-border bg-card rounded-2xl shadow-sm hover:border-primary/40 transition-all flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline" className="font-mono text-[11px] font-semibold text-primary bg-primary/5">
                  {b.category}
                </Badge>
                <Badge className={b.isDigital ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}>
                  {b.isDigital ? 'e-Book / PDF' : `${b.availableCopies}/${b.totalCopies} Copies Available`}
                </Badge>
              </div>
              <CardTitle className="text-base font-bold text-foreground mt-2 line-clamp-2">
                {b.title}
              </CardTitle>
              <CardDescription className="text-xs">
                By <span className="font-semibold text-foreground">{b.author}</span> {b.edition ? `• ${b.edition}` : ''}
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-0 pb-4 text-xs text-muted-foreground line-clamp-3">
              {b.description || 'No descriptive abstract registered for this catalog item.'}
            </CardContent>

            <CardFooter className="pt-3 border-t border-border/60 flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl flex-1 text-xs"
                onClick={() => handleBorrow(b.id, b.title)}
                disabled={isPending || (!b.isDigital && b.availableCopies <= 0)}
              >
                <Bookmark className="h-3.5 w-3.5 mr-1" />
                Borrow / Loan
              </Button>

              {b.fileUrl && (
                <Button
                  size="sm"
                  className="rounded-xl flex-1 text-xs"
                  onClick={() => window.open(b.fileUrl, '_blank')}
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
                  Read Digital
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
