import { NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';
const pdfParse = require('pdf-parse');

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    const arrayBuffer = await file.arrayBuffer();
    const pdfBytes = new Uint8Array(arrayBuffer);
    
    // Load original PDF
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const totalPages = pdfDoc.getPageCount();
    
    const results: any[] = [];
    
    for (let i = 0; i < totalPages; i++) {
        // 1. Create a new PDF with just one page
        const newPdfDoc = await PDFDocument.create();
        const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [i]);
        newPdfDoc.addPage(copiedPage);
        const singlePageBytes = await newPdfDoc.save();
        
        // 2. Extract text to identify the student name
        const parseResult = await pdfParse(Buffer.from(singlePageBytes));
        const text = parseResult.text;
        
        let studentName = `page_${i + 1}`;
        const nameMatches = [
            /Student\s*Name\s*[:\s]+([A-Z][A-Z\s\-\']+(?:\s*\[[\w\-]+\])?)/i,
            /Student\s*Name\s*[:\s]+([A-Z][A-Z\s\-\']+)/i,
            /Student Name\s+(\S.+?)(?:\s{2,}|\n|Term)/i
        ];
        
        for (const pattern of nameMatches) {
            const match = text.match(pattern);
            if (match && match[1]) {
                studentName = match[1].trim().replace(/\s+/g, ' ');
                break;
            }
        }

        // Sanitize the filename
        const sanitizedFilename = studentName.replace(/[<>:"/\\|?*\[\]]/g, '_').replace(/[\s_]+/g, '_').replace(/^_+|_+$/g, '');
        
        results.push({
            studentName,
            filename: `${sanitizedFilename || `page_${i + 1}`}.pdf`,
            fileBase64: Buffer.from(singlePageBytes).toString('base64')
        });
    }
    
    return NextResponse.json({ success: true, count: results.length, data: results });

  } catch (error: any) {
    console.error('PDF split error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
