
'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Send, Sparkles, User, X, Bot } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useRole } from '@/context/role-context';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { aiEngine } from '@/ai';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

type Message = {
    role: 'user' | 'bot';
    content: string;
};

// Function to parse the bot's response and create links
const renderMessageContent = (content: string) => {
  const urlRegex = /\("([^"]+)"\s*(\/[^)]+)\)/g;
  const parts = content.split(urlRegex);

  return parts.map((part, index) => {
    // Every 3rd part is the path, and the one before it is the label
    if (index % 3 === 2) {
      const label = parts[index - 1].replace(/"/g, '').trim();
      const path = part.trim();
      return (
        <Link key={index} href={path} className="text-primary underline hover:no-underline font-semibold">
          {label}
        </Link>
      );
    }
    // Render the text parts that are not links
    if (index % 3 === 0) {
      // Clean up leftover quote from the regex split
      return part.replace(/"/g, '');
    }
    return null;
  });
};

export function SupportBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
        role: 'bot',
        content: "Hello! I'm your AI assistant, the GIIA Support Bot. How can I help you today?",
    }
  ]);
  const [input, setInput] = useState('');
  const [isAiThinking, startAiTransition] = useTransition();
  const { user, role } = useRole();
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  
  // Create a unique ID for this chat session
  const [contextId] = useState(() => `support-session-${Date.now()}-${Math.random().toString(36).substring(7)}`);

  useEffect(() => {
    if (scrollViewportRef.current) {
        scrollViewportRef.current.scrollTo({ top: scrollViewportRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);


  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !role) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');

    startAiTransition(async () => {
        try {
            const response = await aiEngine.support.answer({
                question: currentInput,
                role: role,
                history: messages.slice(-4), // Send recent history for context
                contextId: contextId, // Pass the session ID to the agent
            });

            const botMessage: Message = { role: 'bot', content: response.answer };
            setMessages(prev => [...prev, botMessage]);

        } catch (error) {
            console.error("AI support error:", error);
            const errorMessage: Message = { role: 'bot', content: "Sorry, I'm having trouble connecting. Please try again in a moment." };
            setMessages(prev => [...prev, errorMessage]);
        }
    });
  };

  return (
    <>
      <Button
        className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-lg z-50 transition-transform duration-300 ease-in-out hover:scale-110"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle chat"
      >
        <MessageSquare className={cn("h-7 w-7 transition-all duration-300", isOpen && "rotate-90 scale-0")} />
        <X className={cn("absolute h-7 w-7 transition-all duration-300", !isOpen && "-rotate-90 scale-0")} />
      </Button>
      
      <div className={cn(
          "fixed bottom-24 right-6 z-50 transition-all duration-500 ease-in-out",
          isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"
      )}>
        <Card className="w-full max-w-sm h-[60vh] flex flex-col shadow-2xl">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="text-primary" />
              GIIA Support Bot
            </CardTitle>
             <CardDescription>
              Your AI-powered guide to the GIIA Portal.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="flex-1 p-0 overflow-hidden">
            <ScrollArea className="h-full p-4" viewportRef={scrollViewportRef}>
                <div className="space-y-6">
                    {messages.map((message, index) => (
                        <div
                            key={index}
                            className={cn(
                                "flex items-start gap-3",
                                message.role === 'user' && "justify-end"
                            )}
                        >
                            {message.role === 'bot' && (
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback><Bot /></AvatarFallback>
                                </Avatar>
                            )}
                            <div
                                className={cn(
                                    "max-w-[75%] rounded-lg p-3 text-sm whitespace-pre-wrap",
                                    message.role === 'user'
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted"
                                )}
                            >
                                {message.role === 'bot' ? renderMessageContent(message.content) : message.content}
                            </div>
                            {message.role === 'user' && (
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={user?.personalInfo?.profilePicture || ''} />
                                    <AvatarFallback><User /></AvatarFallback>
                                </Avatar>
                            )}
                        </div>
                    ))}
                    {isAiThinking && (
                         <div className="flex items-start gap-3">
                             <Avatar className="h-8 w-8">
                                <AvatarFallback><Bot /></AvatarFallback>
                             </Avatar>
                             <div className="bg-muted rounded-lg p-3 text-sm">
                                <Loader2 className="h-5 w-5 animate-spin" />
                             </div>
                         </div>
                    )}
                </div>
            </ScrollArea>
          </CardContent>

          <CardFooter className="p-4 border-t">
            <form onSubmit={handleSendMessage} className="flex w-full items-center gap-2">
                <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask a question..."
                    className="flex-1"
                    disabled={isAiThinking}
                />
                <Button type="submit" size="icon" aria-label="Send message" disabled={isAiThinking || !input.trim()}>
                    <Send className="h-4 w-4" />
                </Button>
            </form>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}
