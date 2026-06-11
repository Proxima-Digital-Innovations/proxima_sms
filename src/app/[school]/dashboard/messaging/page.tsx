'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, Timestamp, query, where, orderBy } from '@/lib/firebase-stubs';
import { db, auth, storage } from "@/lib/firebase";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Plus, Send, Inbox } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

type Message = {
    id: string;
    subject: string;
    body: string;
    from: string;
    fromName: string;
    to: string;
    toName: string;
    sentAt: any;
    read: boolean;
};

export default function MessagingPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
    const { toast } = useToast();

    // Mock current user - in real app, get from auth context
    const currentUserId = 'current_user_id';
    const currentUserName = 'Admin User';

    const [formData, setFormData] = useState({
        to: '',
        subject: '',
        body: ''
    });

    useEffect(() => {
        fetchMessages();
        fetchUsers();
    }, []);

    const fetchMessages = async () => {
        try {
            const snapshot = await getDocs(
                query(
                    collection(db, 'messages'),
                    orderBy('sentAt', 'desc')
                )
            );
            const messagesData = snapshot.docs.map((doc: any) => ({
                id: doc.id,
                ...doc.data()
            })) as Message[];
            setMessages(messagesData);
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    };

    const fetchUsers = async () => {
        try {
            const snapshot = await getDocs(collection(db, 'users'));
            const usersData = snapshot.docs.map((doc: any) => ({
                id: doc.id,
                ...doc.data()
            }));
            setUsers(usersData);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const recipient = users.find(u => u.id === formData.to);
            
            await addDoc(collection(db, 'messages'), {
                subject: formData.subject,
                body: formData.body,
                from: currentUserId,
                fromName: currentUserName,
                to: formData.to,
                toName: recipient ? `${recipient.firstName} ${recipient.lastName}` : 'Unknown',
                sentAt: Timestamp.now(),
                read: false
            });

            toast({ title: 'Success', description: 'Message sent successfully.' });
            setIsDialogOpen(false);
            resetForm();
            fetchMessages();
        } catch (error) {
            console.error('Error sending message:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to send message.' });
        }
    };

    const resetForm = () => {
        setFormData({
            to: '',
            subject: '',
            body: ''
        });
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return '-';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        
        if (hours < 24) {
            return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        }
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const inbox = messages.filter(m => m.to === currentUserId);
    const sent = messages.filter(m => m.from === currentUserId);
    const unreadCount = inbox.filter(m => !m.read).length;

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <MessageSquare className="h-8 w-8" />
                        Messaging
                    </h1>
                    <p className="text-muted-foreground">Internal communication system</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) resetForm();
                }}>
                    <DialogTrigger asChild>
                        <Button><Plus className="mr-2 h-4 w-4" />Compose</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Compose Message</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <Label htmlFor="to">To *</Label>
                                <Select value={formData.to} onValueChange={(value) => setFormData({ ...formData, to: value })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select recipient" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {users.map(user => (
                                            <SelectItem key={user.id} value={user.id}>
                                                {user.firstName} {user.lastName} ({user.role})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="subject">Subject *</Label>
                                <Input
                                    id="subject"
                                    value={formData.subject}
                                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="body">Message *</Label>
                                <Textarea
                                    id="body"
                                    value={formData.body}
                                    onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                                    rows={8}
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                <Button type="submit">
                                    <Send className="mr-2 h-4 w-4" />
                                    Send
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Tabs defaultValue="inbox" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="inbox" className="gap-2">
                        <Inbox className="h-4 w-4" />
                        Inbox
                        {unreadCount > 0 && (
                            <Badge variant="destructive" className="ml-1">{unreadCount}</Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="sent">Sent</TabsTrigger>
                </TabsList>

                <TabsContent value="inbox" className="space-y-3">
                    <Card>
                        <CardHeader>
                            <CardTitle>Inbox</CardTitle>
                            <CardDescription>{inbox.length} message(s)</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {inbox.length === 0 ? (
                                <div className="py-8 text-center text-muted-foreground">
                                    <Inbox className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                    <p>No messages in inbox</p>
                                </div>
                            ) : (
                                inbox.map(message => (
                                    <div
                                        key={message.id}
                                        className={`p-4 border rounded-lg cursor-pointer hover:bg-muted/50 ${!message.read ? 'bg-blue-50 border-blue-200' : ''}`}
                                        onClick={() => setSelectedMessage(message)}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-semibold">{message.fromName}</p>
                                                    {!message.read && <Badge variant="default" className="text-xs">New</Badge>}
                                                </div>
                                                <p className="font-medium mt-1">{message.subject}</p>
                                                <p className="text-sm text-muted-foreground line-clamp-1">{message.body}</p>
                                            </div>
                                            <span className="text-xs text-muted-foreground">{formatDate(message.sentAt)}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="sent" className="space-y-3">
                    <Card>
                        <CardHeader>
                            <CardTitle>Sent Messages</CardTitle>
                            <CardDescription>{sent.length} message(s)</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {sent.length === 0 ? (
                                <div className="py-8 text-center text-muted-foreground">
                                    <Send className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                    <p>No sent messages</p>
                                </div>
                            ) : (
                                sent.map(message => (
                                    <div
                                        key={message.id}
                                        className="p-4 border rounded-lg cursor-pointer hover:bg-muted/50"
                                        onClick={() => setSelectedMessage(message)}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <p className="font-semibold">To: {message.toName}</p>
                                                <p className="font-medium mt-1">{message.subject}</p>
                                                <p className="text-sm text-muted-foreground line-clamp-1">{message.body}</p>
                                            </div>
                                            <span className="text-xs text-muted-foreground">{formatDate(message.sentAt)}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Message Detail Dialog */}
            <Dialog open={!!selectedMessage} onOpenChange={(open) => !open && setSelectedMessage(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{selectedMessage?.subject}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between text-sm">
                            <div>
                                <p><strong>From:</strong> {selectedMessage?.fromName}</p>
                                <p><strong>To:</strong> {selectedMessage?.toName}</p>
                            </div>
                            <p className="text-muted-foreground">{formatDate(selectedMessage?.sentAt)}</p>
                        </div>
                        <Separator />
                        <div className="whitespace-pre-wrap">{selectedMessage?.body}</div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
