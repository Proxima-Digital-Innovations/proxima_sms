'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Upload,
  FileText,
  FileCheck,
  X,
  ExternalLink,
  Download,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
  FileCode,
  Image as ImageIcon,
} from 'lucide-react';

interface DocumentUploadZoneProps {
  onUploaded: (url: string, fileName: string) => void;
  folder?: string;
  initialUrl?: string;
  initialFileName?: string;
  label?: string;
  helperText?: string;
}

export function DocumentUploadZone({
  onUploaded,
  folder = 'academic',
  initialUrl = '',
  initialFileName = '',
  label = 'Upload Outside Document',
  helperText = 'Supports PDF, Word (.docx, .doc), Excel (.xlsx), PowerPoint (.pptx), images & scans up to 35MB',
}: DocumentUploadZoneProps) {
  const [fileUrl, setFileUrl] = useState<string>(initialUrl);
  const [fileName, setFileName] = useState<string>(initialFileName || (initialUrl ? initialUrl.split('/').pop() || 'Attached Document' : ''));
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file) return;
    setErrorMessage(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload document');
      }

      setFileUrl(data.url);
      setFileName(data.fileName);
      onUploaded(data.url, data.fileName);
    } catch (err: any) {
      console.error('Document upload error:', err);
      setErrorMessage(err.message || 'File upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFileUrl('');
    setFileName('');
    onUploaded('', '');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FileText className="w-8 h-8 text-rose-500" />;
    if (ext === 'doc' || ext === 'docx') return <FileText className="w-8 h-8 text-blue-500" />;
    if (ext === 'xls' || ext === 'xlsx' || ext === 'csv') return <FileSpreadsheet className="w-8 h-8 text-emerald-500" />;
    if (['png', 'jpg', 'jpeg', 'webp'].includes(ext || '')) return <ImageIcon className="w-8 h-8 text-purple-500" />;
    return <FileCode className="w-8 h-8 text-amber-500" />;
  };

  return (
    <div className="space-y-2">
      {label && <label className="text-xs font-semibold text-muted-foreground block">{label}</label>}

      {fileUrl ? (
        <div className="flex items-center justify-between p-3.5 bg-primary/5 border border-primary/20 rounded-xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center border border-border shrink-0">
              {getFileIcon(fileName)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground truncate max-w-[260px]">{fileName}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-semibold text-emerald-500 flex items-center gap-1">
                  <FileCheck className="w-3 h-3" /> Ready for submission
                </span>
                <span className="text-[10px] text-muted-foreground">•</span>
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-semibold text-primary hover:underline flex items-center gap-0.5"
                >
                  View <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleRemove}
            className="h-8 w-8 text-muted-foreground hover:text-destructive rounded-lg"
            title="Remove document"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-2 ${
            isDragging
              ? 'border-primary bg-primary/10 scale-[1.01]'
              : 'border-border bg-background/50 hover:bg-muted/40 hover:border-primary/40'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.png,.jpg,.jpeg"
            className="hidden"
          />

          {isUploading ? (
            <div className="py-2 flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-xs font-semibold text-foreground">Uploading document to server...</p>
            </div>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">
                  Click to browse or drag & drop outside file here
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{helperText}</p>
              </div>
            </>
          )}
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Display Card for Attached Documents in Editor / Reviewer Views
 */
export function AttachedDocumentBanner({
  fileUrl,
  title = 'Attached Document',
}: {
  fileUrl?: string | null;
  title?: string;
}) {
  if (!fileUrl) return null;

  const fileName = fileUrl.split('/').pop() || 'Document Attachment';
  const ext = fileName.split('.').pop()?.toLowerCase();
  const isPdf = ext === 'pdf';
  const isImage = ['png', 'jpg', 'jpeg', 'webp'].includes(ext || '');

  return (
    <div className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <FileText className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground">{title}</h4>
            <p className="text-[11px] text-muted-foreground font-mono truncate max-w-xs">{fileName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Open / Preview
          </a>
          <a
            href={fileUrl}
            download={fileName}
            className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Download
          </a>
        </div>
      </div>

      {isPdf && (
        <div className="mt-3 rounded-lg overflow-hidden border border-border bg-background">
          <iframe src={fileUrl} className="w-full h-96 border-none" title="PDF Preview" />
        </div>
      )}

      {isImage && (
        <div className="mt-3 rounded-lg overflow-hidden border border-border bg-background flex justify-center p-2">
          <img src={fileUrl} alt="Attached Document Preview" className="max-h-96 object-contain rounded" />
        </div>
      )}
    </div>
  );
}
