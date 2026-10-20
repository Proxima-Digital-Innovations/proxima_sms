import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
  '.csv': 'text/csv',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const pathSegments = resolvedParams.path || [];

    // Security check: prevent directory traversal attacks
    if (pathSegments.some((seg) => seg.includes('..') || seg.includes('/') || seg.includes('\\'))) {
      return new NextResponse('Invalid file path', { status: 400 });
    }

    const relativeFilePath = path.join(...pathSegments);
    const absoluteFilePath = path.join(process.cwd(), 'public', 'uploads', relativeFilePath);

    if (!fs.existsSync(absoluteFilePath)) {
      return new NextResponse('File not found', { status: 404 });
    }

    const stat = fs.statSync(absoluteFilePath);
    if (!stat.isFile()) {
      return new NextResponse('Resource is not a file', { status: 400 });
    }

    const ext = path.extname(absoluteFilePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const fileBuffer = fs.readFileSync(absoluteFilePath);

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': stat.size.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    console.error('Error serving uploaded asset:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
