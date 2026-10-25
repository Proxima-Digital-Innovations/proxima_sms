'use client';

import React, { useState, useRef, useEffect } from 'react';
import { PenTool, Highlighter, StickyNote, Eraser, Download, RotateCcw, ZoomIn, ZoomOut, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AnnotationItem {
  id: string;
  type: 'PEN' | 'HIGHLIGHTER' | 'NOTE';
  color: string;
  points?: { x: number; y: number }[];
  text?: string;
  x?: number;
  y?: number;
}

interface DocumentAnnotationStudioProps {
  documentUrl: string;
  documentName?: string;
  onSaveAnnotations?: (annotations: AnnotationItem[]) => void;
  initialAnnotations?: AnnotationItem[];
}

export function DocumentAnnotationStudio({
  documentUrl,
  documentName = 'Submission Document',
  onSaveAnnotations,
  initialAnnotations = [],
}: DocumentAnnotationStudioProps) {
  const [activeTool, setActiveTool] = useState<'PEN' | 'HIGHLIGHTER' | 'NOTE' | 'ERASER'>('PEN');
  const [penColor, setPenColor] = useState('#dc2626'); // Red pen for grading
  const [annotations, setAnnotations] = useState<AnnotationItem[]>(initialAnnotations);
  const [isDrawing, setIsDrawing] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Redraw canvas whenever annotations change
  const redraw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const item of annotations) {
      if (item.type === 'PEN' && item.points && item.points.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = item.color;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.moveTo(item.points[0].x, item.points[0].y);
        for (let i = 1; i < item.points.length; i++) {
          ctx.lineTo(item.points[i].x, item.points[i].y);
        }
        ctx.stroke();
      } else if (item.type === 'HIGHLIGHTER' && item.points && item.points.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.4)'; // Transparent yellow
        ctx.lineWidth = 14;
        ctx.lineCap = 'square';
        ctx.moveTo(item.points[0].x, item.points[0].y);
        for (let i = 1; i < item.points.length; i++) {
          ctx.lineTo(item.points[i].x, item.points[i].y);
        }
        ctx.stroke();
      }
    }
  };

  useEffect(() => {
    redraw();
  }, [annotations]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === 'NOTE' || activeTool === 'ERASER') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoomLevel;
    const y = (e.clientY - rect.top) / zoomLevel;

    setIsDrawing(true);
    const newItem: AnnotationItem = {
      id: Date.now().toString(),
      type: activeTool,
      color: activeTool === 'PEN' ? penColor : '#facc15',
      points: [{ x, y }],
    };
    setAnnotations((prev) => [...prev, newItem]);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoomLevel;
    const y = (e.clientY - rect.top) / zoomLevel;

    setAnnotations((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      if (!last.points) return prev;
      const updatedPoints = [...last.points, { x, y }];
      return [...prev.slice(0, prev.length - 1), { ...last, points: updatedPoints }];
    });
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleAddStickyNote = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool !== 'NOTE') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoomLevel;
    const y = (e.clientY - rect.top) / zoomLevel;

    const text = prompt('Enter instructor sticky remark / note:')?.trim();
    if (text) {
      setAnnotations((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          type: 'NOTE',
          color: '#fef08a',
          text,
          x,
          y,
        },
      ]);
    }
  };

  const isPdf = documentUrl.toLowerCase().endsWith('.pdf') || documentUrl.includes('.pdf');

  return (
    <div className="flex flex-col border border-border rounded-2xl overflow-hidden bg-background shadow-md">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between p-3 bg-muted/40 border-b border-border gap-2">
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            type="button"
            variant={activeTool === 'PEN' ? 'default' : 'outline'}
            onClick={() => setActiveTool('PEN')}
            className="rounded-xl h-8 px-2.5 text-xs gap-1 font-semibold"
          >
            <PenTool className="w-3.5 h-3.5 text-red-500" /> Red Ink Stylus
          </Button>

          <Button
            size="sm"
            type="button"
            variant={activeTool === 'HIGHLIGHTER' ? 'default' : 'outline'}
            onClick={() => setActiveTool('HIGHLIGHTER')}
            className="rounded-xl h-8 px-2.5 text-xs gap-1 font-semibold"
          >
            <Highlighter className="w-3.5 h-3.5 text-amber-500" /> Highlighter
          </Button>

          <Button
            size="sm"
            type="button"
            variant={activeTool === 'NOTE' ? 'default' : 'outline'}
            onClick={() => setActiveTool('NOTE')}
            className="rounded-xl h-8 px-2.5 text-xs gap-1 font-semibold"
          >
            <StickyNote className="w-3.5 h-3.5 text-yellow-500" /> Sticky Remark
          </Button>

          <Button
            size="sm"
            type="button"
            variant="ghost"
            onClick={() => setAnnotations([])}
            className="rounded-xl h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Clear All
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-background border border-border rounded-xl px-2 py-0.5 text-xs font-mono">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.1))}
              className="p-1 hover:text-primary"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2">{Math.round(zoomLevel * 100)}%</span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(1.5, z + 0.1))}
              className="p-1 hover:text-primary"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <a
            href={documentUrl}
            download
            className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold rounded-xl transition-all"
          >
            <Download className="w-3.5 h-3.5" /> Download Original
          </a>
        </div>
      </div>

      {/* Main Document & Canvas Viewport */}
      <div
        className="relative bg-slate-900 overflow-auto max-h-[500px] flex justify-center p-4 cursor-crosshair select-none"
        onClick={handleAddStickyNote}
      >
        <div
          style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center' }}
          className="relative shadow-2xl bg-white rounded-lg overflow-hidden min-w-[650px] min-h-[850px]"
        >
          {isPdf ? (
            <iframe
              src={`${documentUrl}#toolbar=0`}
              className="w-[650px] h-[850px] border-0 pointer-events-none"
              title={documentName}
            />
          ) : (
            <div className="w-[650px] h-[850px] p-10 font-mono text-sm text-slate-800 whitespace-pre-wrap leading-relaxed select-text">
              <div className="border-b pb-4 mb-6 text-xs text-slate-400 uppercase tracking-widest font-sans font-bold flex justify-between">
                <span>{documentName}</span>
                <span>Proxima SpeedGrader Viewer</span>
              </div>
              <p className="text-slate-700 font-sans leading-relaxed text-sm">
                Document Preview: Annotated overlay active. Use Red Ink Stylus or Highlighter above to mark corrections directly onto student work.
              </p>
            </div>
          )}

          {/* Transparent Canvas Overlay for Stylus Drawing */}
          <canvas
            ref={canvasRef}
            width={650}
            height={850}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="absolute inset-0 z-20 pointer-events-auto cursor-crosshair"
          />

          {/* Sticky Remark Notes Render */}
          {annotations
            .filter((a) => a.type === 'NOTE')
            .map((note) => (
              <div
                key={note.id}
                style={{ left: note.x, top: note.y }}
                className="absolute z-30 bg-amber-200 text-amber-950 p-2.5 rounded-lg shadow-lg border border-amber-300 max-w-[180px] text-xs font-sans animate-in zoom-in-95 pointer-events-auto"
              >
                <div className="font-bold text-[10px] uppercase text-amber-800 mb-0.5 flex items-center gap-1">
                  <StickyNote className="w-3 h-3" /> Remark
                </div>
                {note.text}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
