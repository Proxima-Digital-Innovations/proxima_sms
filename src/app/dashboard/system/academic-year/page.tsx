'use client';

import { useState, useEffect } from 'react';
import { getCalendarEvents, addCalendarEvent, deleteCalendarEvent } from '@/actions/calendar-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Calendar as CalendarIcon, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type CalendarEvent = {
    id: string;
    title: string;
    description?: string;
    eventType: 'Holiday' | 'Exam' | 'Term Start' | 'Term End' | 'Meeting' | 'Other';
    startDate: Date;
    endDate?: Date | null;
    createdAt: Date;
};

export default function AcademicCalendarPage() {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const { toast } = useToast();

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        eventType: 'Other' as CalendarEvent['eventType'],
        startDate: '',
        endDate: ''
    });

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        setIsLoading(true);
        try {
            const result = await getCalendarEvents();
            if (result.success && 'data' in result && result.data) {
                setEvents((result as any).data as any[]);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error fetching events:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load events.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const result = await addCalendarEvent({
                title: formData.title,
                description: formData.description,
                eventType: formData.eventType,
                startDate: new Date(formData.startDate),
                endDate: formData.endDate ? new Date(formData.endDate) : undefined,
            });

            if (result.success) {
                toast({ title: 'Success', description: 'Event added successfully.' });
                setIsDialogOpen(false);
                resetForm();
                fetchEvents();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error adding event:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to add event.' });
        }
    };

    const handleDelete = async (id: string, title: string) => {
        if (!confirm(`Delete event "${title}"?`)) return;
        try {
            const result = await deleteCalendarEvent(id);
            if (result.success) {
                toast({ title: 'Success', description: 'Event deleted successfully.' });
                fetchEvents();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error deleting event:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete event.' });
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            description: '',
            eventType: 'Other',
            startDate: '',
            endDate: ''
        });
    };

    const formatDate = (dateValue: any) => {
        if (!dateValue) return '-';
        const date = new Date(dateValue);
        return date.toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const getEventColor = (type: string) => {
        const colors: Record<string, string> = {
            'Holiday': 'bg-red-100 text-red-800',
            'Exam': 'bg-orange-100 text-orange-800',
            'Term Start': 'bg-green-100 text-green-800',
            'Term End': 'bg-blue-100 text-blue-800',
            'Meeting': 'bg-purple-100 text-purple-800',
            'Other': 'bg-gray-100 text-gray-800'
        };
        return colors[type] || colors['Other'];
    };

    // Group events by month
    const groupedEvents = events.reduce((acc, event) => {
        const month = formatDate(event.startDate).split(' ').slice(0, 2).join(' '); // "January 2025"
        if (!acc[month]) acc[month] = [];
        acc[month].push(event);
        return acc;
    }, {} as Record<string, CalendarEvent[]>);

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <CalendarIcon className="h-8 w-8" />
                        Academic Calendar
                    </h1>
                    <p className="text-muted-foreground">Manage school events, terms, and holidays</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) resetForm();
                }}>
                    <DialogTrigger asChild>
                        <Button><Plus className="mr-2 h-4 w-4" />Add Event</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Add Calendar Event</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <Label htmlFor="title">Event Title *</Label>
                                <Input
                                    id="title"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="type">Event Type *</Label>
                                <Select value={formData.eventType} onValueChange={(value: any) => setFormData({ ...formData, eventType: value })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Holiday">Holiday</SelectItem>
                                        <SelectItem value="Exam">Exam</SelectItem>
                                        <SelectItem value="Term Start">Term Start</SelectItem>
                                        <SelectItem value="Term End">Term End</SelectItem>
                                        <SelectItem value="Meeting">Meeting</SelectItem>
                                        <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="startDate">Start Date *</Label>
                                    <Input
                                        id="startDate"
                                        type="date"
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="endDate">End Date (Optional)</Label>
                                    <Input
                                        id="endDate"
                                        type="date"
                                        value={formData.endDate}
                                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                <Button type="submit">Add Event</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="space-y-6">
                {Object.keys(groupedEvents).length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                            <p className="text-muted-foreground">No events scheduled. Add your first event to get started.</p>
                        </CardContent>
                    </Card>
                ) : (
                    Object.entries(groupedEvents).map(([month, monthEvents]) => (
                        <Card key={month}>
                            <CardHeader>
                                <CardTitle>{month}</CardTitle>
                                <CardDescription>{monthEvents.length} event(s)</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {monthEvents.map(event => (
                                    <div key={event.id} className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-semibold">{event.title}</h3>
                                                <Badge className={getEventColor(event.eventType)}>{event.eventType}</Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {formatDate(event.startDate)}
                                                {event.endDate && ` - ${formatDate(event.endDate)}`}
                                            </p>
                                            {event.description && (
                                                <p className="text-sm mt-2">{event.description}</p>
                                            )}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDelete(event.id, event.title)}
                                        >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
