'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export interface ELibraryFilterOptions {
  category?: string;
  department?: string;
  subject?: string;
  resourceType?: string;
  query?: string;
}

export async function getELibraryBooks(
  filterOrCategory?: ELibraryFilterOptions | string,
  legacyQuery?: string
) {
  try {
    let category: string | undefined;
    let department: string | undefined;
    let subject: string | undefined;
    let resourceType: string | undefined;
    let query: string | undefined;

    if (typeof filterOrCategory === 'object' && filterOrCategory !== null) {
      category = filterOrCategory.category;
      department = filterOrCategory.department;
      subject = filterOrCategory.subject;
      resourceType = filterOrCategory.resourceType;
      query = filterOrCategory.query;
    } else {
      category = filterOrCategory;
      query = legacyQuery;
    }

    const where: any = {};

    if (category && category !== 'ALL') {
      where.category = category;
    }
    if (department && department !== 'ALL') {
      where.department = department;
    }
    if (subject && subject !== 'ALL') {
      where.subject = subject;
    }
    if (resourceType && resourceType !== 'ALL') {
      where.resourceType = resourceType;
    }

    if (query && query.trim()) {
      const q = query.trim();
      where.OR = [
        { title: { contains: q } },
        { author: { contains: q } },
        { isbn: { contains: q } },
        { department: { contains: q } },
        { subject: { contains: q } },
      ];
    }

    const books = await prisma.eLibraryBook.findMany({
      where,
      include: {
        _count: { select: { borrows: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: books };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getELibraryTaxonomyAction() {
  try {
    // 1. Get institutional departments and subjects
    const dbDepts = await prisma.department.findMany({
      select: { name: true, code: true },
      orderBy: { name: 'asc' },
    });

    const dbSubjects = await prisma.subject.findMany({
      select: { name: true, code: true },
      orderBy: { name: 'asc' },
    });

    // 2. Get distinct values from existing ELibraryBook table
    const bookDepts = await prisma.eLibraryBook.findMany({
      where: { department: { not: null } },
      select: { department: true },
      distinct: ['department'],
    });

    const bookSubjects = await prisma.eLibraryBook.findMany({
      where: { subject: { not: null } },
      select: { subject: true },
      distinct: ['subject'],
    });

    const departments = Array.from(
      new Set([
        ...dbDepts.map((d) => d.name),
        ...bookDepts.map((b) => b.department!).filter(Boolean),
        'Computer Science',
        'Electrical & Electronics Engineering',
        'Mechanical Engineering',
        'Medicine & Surgery',
        'Civil Law & Jurisprudence',
        'Accounting & Finance',
        'Nursing Science',
      ])
    ).sort();

    const subjects = Array.from(
      new Set([
        ...dbSubjects.map((s) => s.name),
        ...bookSubjects.map((b) => b.subject!).filter(Boolean),
        'Operating Systems',
        'Data Structures & Algorithms',
        'Database Management Systems',
        'Thermodynamics & Heat Transfer',
        'Anatomy & Physiology',
        'Constitutional Law',
        'Financial Accounting & Reporting',
        'Artificial Intelligence & Machine Learning',
      ])
    ).sort();

    const categories = [
      'Sciences & Computing',
      'Engineering & Technology',
      'Health & Medical Sciences',
      'Law & Legal Studies',
      'Business & Management Sciences',
      'Arts, Humanities & Education',
      'General Studies',
    ];

    const resourceTypes = [
      { id: 'TEXTBOOK', label: 'Textbook / Core Reading' },
      { id: 'PAST_QUESTION', label: 'Past Exam Question / Paper' },
      { id: 'JOURNAL_ARTICLE', label: 'Journal Article / Research Paper' },
      { id: 'THESIS_DISSERTATION', label: 'Thesis / Dissertation' },
      { id: 'LECTURE_MANUAL', label: 'Lecture Note / Lab Manual' },
    ];

    return {
      success: true,
      data: {
        departments,
        subjects,
        categories,
        resourceTypes,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createELibraryBook(data: {
  title: string;
  author: string;
  category: string;
  department?: string;
  subject?: string;
  resourceType?: string;
  isbn?: string;
  edition?: string;
  publisher?: string;
  description?: string;
  fileUrl?: string;
  totalCopies?: number;
  isDigital?: boolean;
}) {
  try {
    const book = await prisma.eLibraryBook.create({
      data: {
        title: data.title,
        author: data.author,
        category: data.category,
        department: data.department || null,
        subject: data.subject || null,
        resourceType: data.resourceType || 'TEXTBOOK',
        isbn: data.isbn || null,
        edition: data.edition || null,
        publisher: data.publisher || null,
        description: data.description || null,
        fileUrl: data.fileUrl || null,
        totalCopies: data.totalCopies || 1,
        availableCopies: data.totalCopies || 1,
        isDigital: data.isDigital ?? true,
      },
    });

    try {
      revalidatePath('/dashboard/elibrary');
    } catch {}
    return { success: true, data: book };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function seedSampleELibraryCatalogAction() {
  try {
    const sampleBooks = [
      {
        title: 'Operating System Concepts (10th Edition)',
        author: 'Abraham Silberschatz, Peter B. Galvin, Greg Gagne',
        category: 'Sciences & Computing',
        department: 'Computer Science',
        subject: 'Operating Systems',
        resourceType: 'TEXTBOOK',
        isbn: '978-1119800361',
        edition: '10th Edition',
        publisher: 'Wiley Higher Education',
        description: 'Comprehensive study of operating systems architecture, process scheduling, memory management, and file systems.',
        totalCopies: 6,
        availableCopies: 5,
        isDigital: true,
        fileUrl: 'https://example.com/books/os-silberschatz.pdf',
      },
      {
        title: 'Introduction to Algorithms (CLRS 4th Edition)',
        author: 'Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest, Clifford Stein',
        category: 'Sciences & Computing',
        department: 'Computer Science',
        subject: 'Data Structures & Algorithms',
        resourceType: 'TEXTBOOK',
        isbn: '978-0262046305',
        edition: '4th Edition',
        publisher: 'MIT Press',
        description: 'The definitive textbook on modern algorithms, analysis of algorithmic efficiency, dynamic programming, and graph theory.',
        totalCopies: 10,
        availableCopies: 8,
        isDigital: true,
        fileUrl: 'https://example.com/books/clrs-algorithms.pdf',
      },
      {
        title: 'CSC 301: Operating Systems Past Examination Papers (2020-2025)',
        author: 'Department of Computer Science Academic Board',
        category: 'Sciences & Computing',
        department: 'Computer Science',
        subject: 'Operating Systems',
        resourceType: 'PAST_QUESTION',
        edition: '2025 Archive',
        publisher: 'Proxima University Senate',
        description: 'Complete 5-year compiled past examination questions, marking schemes, and solution keys for undergraduate Operating Systems.',
        totalCopies: 20,
        availableCopies: 20,
        isDigital: true,
        fileUrl: 'https://example.com/past-questions/csc301-archive.pdf',
      },
      {
        title: 'Fundamentals of Electric Circuits (7th Edition)',
        author: 'Charles K. Alexander, Matthew N. O. Sadiku',
        category: 'Engineering & Technology',
        department: 'Electrical & Electronics Engineering',
        subject: 'Circuit Theory & Electronics',
        resourceType: 'TEXTBOOK',
        isbn: '978-1260226409',
        edition: '7th Edition',
        publisher: 'McGraw-Hill Education',
        description: 'Standard textbook for electrical engineering covering DC/AC analysis, operational amplifiers, and Laplace transforms.',
        totalCopies: 8,
        availableCopies: 6,
        isDigital: true,
        fileUrl: 'https://example.com/books/electric-circuits.pdf',
      },
      {
        title: "Gray's Anatomy for Students (4th Edition)",
        author: 'Richard Drake, A. Wayne Vogl, Adam W. M. Mitchell',
        category: 'Health & Medical Sciences',
        department: 'Medicine & Surgery',
        subject: 'Anatomy & Physiology',
        resourceType: 'TEXTBOOK',
        isbn: '978-0323393041',
        edition: '4th Edition',
        publisher: 'Elsevier Health',
        description: 'Clinically relevant human anatomy textbook with surface anatomy, diagnostic imaging correlations, and regional anatomy.',
        totalCopies: 5,
        availableCopies: 3,
        isDigital: true,
        fileUrl: 'https://example.com/books/grays-anatomy.pdf',
      },
      {
        title: 'Constitutional Law of Nigeria: Principles and Cases',
        author: 'Prof. Ben Nwabueze, SAN',
        category: 'Law & Legal Studies',
        department: 'Civil Law & Jurisprudence',
        subject: 'Constitutional Law',
        resourceType: 'TEXTBOOK',
        isbn: '978-9781561234',
        edition: '3rd Edition',
        publisher: 'Spectrum Books Limited',
        description: 'Exhaustive treatise examining the constitutional history, separation of powers, fundamental rights, and judicial review.',
        totalCopies: 4,
        availableCopies: 4,
        isDigital: false,
      },
    ];

    for (const book of sampleBooks) {
      const existing = await prisma.eLibraryBook.findFirst({
        where: {
          OR: [
            { isbn: book.isbn ? book.isbn : undefined },
            { title: book.title },
          ],
        },
      });
      if (!existing) {
        await prisma.eLibraryBook.create({ data: book });
      } else {
        await prisma.eLibraryBook.update({
          where: { id: existing.id },
          data: {
            title: book.title,
            author: book.author,
            category: book.category,
            department: book.department,
            subject: book.subject,
            resourceType: book.resourceType,
            edition: book.edition,
            publisher: book.publisher,
            description: book.description,
            fileUrl: book.fileUrl,
            totalCopies: book.totalCopies,
            availableCopies: book.availableCopies,
            isDigital: book.isDigital,
          },
        });
      }
    }

    try {
      revalidatePath('/dashboard/elibrary');
    } catch {}
    return { success: true, message: 'Sample catalog successfully categorized and seeded.' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function borrowELibraryBook(data: {
  bookId: string;
  userId: string;
  durationDays?: number;
}) {
  try {
    const days = data.durationDays || 14;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + days);

    return await prisma.$transaction(async (tx) => {
      const book = await tx.eLibraryBook.findUnique({
        where: { id: data.bookId },
      });

      if (!book) throw new Error('Book not found.');
      if (!book.isDigital && book.availableCopies <= 0) {
        throw new Error('No physical copies currently available.');
      }

      const borrow = await tx.eLibraryBorrowRecord.create({
        data: {
          bookId: data.bookId,
          userId: data.userId,
          dueDate,
          status: 'BORROWED',
        },
      });

      if (!book.isDigital) {
        await tx.eLibraryBook.update({
          where: { id: data.bookId },
          data: { availableCopies: { decrement: 1 } },
        });
      }

      return borrow;
    });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function returnELibraryBook(borrowId: string) {
  try {
    return await prisma.$transaction(async (tx) => {
      const record = await tx.eLibraryBorrowRecord.findUnique({
        where: { id: borrowId },
        include: { book: true },
      });

      if (!record) throw new Error('Borrow record not found.');

      await tx.eLibraryBorrowRecord.update({
        where: { id: borrowId },
        data: {
          status: 'RETURNED',
          returnDate: new Date(),
        },
      });

      if (!record.book.isDigital) {
        await tx.eLibraryBook.update({
          where: { id: record.bookId },
          data: { availableCopies: { increment: 1 } },
        });
      }

      return { success: true };
    });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getELibraryLoans(status?: 'BORROWED' | 'RETURNED' | 'OVERDUE') {
  try {
    const where: any = {};
    if (status && status !== 'OVERDUE') {
      where.status = status;
    } else if (status === 'OVERDUE') {
      where.status = 'BORROWED';
      where.dueDate = { lt: new Date() };
    }

    const loans = await prisma.eLibraryBorrowRecord.findMany({
      where,
      include: {
        book: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            studentProfile: { select: { matricNumber: true } },
            staffProfile: { select: { staffCode: true } },
          },
        },
      },
      orderBy: { borrowDate: 'desc' },
    });

    return { success: true, data: loans };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
