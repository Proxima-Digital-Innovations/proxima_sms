import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import fs from 'fs';
import path from 'path';

// Allowed file extensions for academic documents and outside attachments
const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.txt',
  '.rtf',
  '.csv',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
]);

const MAX_FILE_SIZE = 35 * 1024 * 1024; // 35 MB

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized: Please log in to upload files.' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const folderParam = (formData.get('folder') as string) || 'academic';

    if (!file) {
      return NextResponse.json({ error: 'No file provided in the request.' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds maximum allowed limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB.` },
        { status: 400 }
      );
    }

    const originalName = file.name || 'document';
    const ext = path.extname(originalName).toLowerCase();

    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        {
          error: `Unsupported file type (${ext || 'unknown'}). Allowed types: PDF, Word (DOC/DOCX), Excel (XLS/XLSX), PowerPoint (PPT/PPTX), Images (PNG/JPG), and Text.`,
        },
        { status: 400 }
      );
    }

    // Sanitize folder to avoid directory traversal
    const safeFolder = folderParam.replace(/[^a-zA-Z0-9_-]/g, '') || 'academic';

    // Sanitize filename and create unique timestamped name
    const baseName = path
      .basename(originalName, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 50);
    const uniqueFileName = `${Date.now()}-${baseName}${ext}`;

    const targetDir = path.join(process.cwd(), 'public', 'uploads', safeFolder);
    await fs.promises.mkdir(targetDir, { recursive: true });

    const targetPath = path.join(targetDir, uniqueFileName);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    await fs.promises.writeFile(targetPath, buffer);

    const publicUrl = `/api/uploads/${safeFolder}/${uniqueFileName}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: originalName,
      size: file.size,
      mimeType: file.type || 'application/octet-stream',
    });
  } catch (error: any) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred while saving the file.' },
      { status: 500 }
    );
  }
}
