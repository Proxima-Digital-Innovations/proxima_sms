
'use client';
import { useState, useTransition } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Bot, Loader2 } from 'lucide-react';
import { aiEngine } from '@/ai';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

export function LessonNoteSummarizer({ lessonNotes, subject, className }: { lessonNotes: string, subject: string, className: string }) {
  const [summary, setSummary] = useState('');
  const [isGenerating, startTransition] = useTransition();

  const handleGenerateSummary = () => {
    startTransition(async () => {
      setSummary('');
      try {
        const result = await aiEngine.text.summarize({
          text: lessonNotes,
          context: `A lesson note about ${subject} for ${className} students.`,
        });
        if (result.summary) {
          setSummary(result.summary);
        }
      } catch (e) {
        console.error(e);
        setSummary('Failed to generate summary.');
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-accent" />
          <span>AI Summary</span>
        </CardTitle>
        <CardDescription>
          Get a quick, AI-generated summary of the lesson note content.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {summary && (
          <Alert>
            <AlertTitle>Generated Summary</AlertTitle>
            <AlertDescription>
              {summary}
            </AlertDescription>
          </Alert>
        )}
        <Button onClick={handleGenerateSummary} disabled={isGenerating} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Bot className="mr-2 h-4 w-4" /> Generate Summary
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
