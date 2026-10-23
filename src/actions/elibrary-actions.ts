'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getELibraryBooks(category?: string, query?: string) {
  try {
    const where: any = {};
    if (category && category !== 'ALL') {
      where.category = category;
    }
    if (query) {
      where.OR = [
        { title: { contains: query } },
        { author: { contains: query } },
        { isbn: { contains: query } },
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

export async function createELibraryBook(data: {
  title: string;
  author: string;
  category: string;
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

    revalidatePath('/dashboard/elibrary');
    return { success: true, data: book };
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
