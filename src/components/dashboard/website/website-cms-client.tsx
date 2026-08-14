'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { upsertPublicWebsiteConfig } from '@/actions/website-actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export function WebsiteCMSClient({ data }: { data: any }) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState(data.websiteConfig || {});

  const handleConfigSave = async () => {
    setIsSaving(true);
    try {
      await upsertPublicWebsiteConfig({
        preamble: config.preamble,
        phone: config.phone,
        email: config.email,
        address: config.address,
        facebookUrl: config.facebookUrl,
        twitterUrl: config.twitterUrl,
        instagramUrl: config.instagramUrl,
        heroImageUrl: config.heroImageUrl,
      });
      toast({ title: 'Success', description: 'Website config saved.' });
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to save config.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Tabs defaultValue="general" className="w-full">
      <TabsList className="mb-4 flex flex-wrap h-auto">
        <TabsTrigger value="general">General Info</TabsTrigger>
        <TabsTrigger value="carousel">Carousel / Hero</TabsTrigger>
        <TabsTrigger value="events">Events</TabsTrigger>
        <TabsTrigger value="news">News & Blogs</TabsTrigger>
      </TabsList>

      <TabsContent value="general">
        <Card>
          <CardHeader>
            <CardTitle>General Information</CardTitle>
            <CardDescription>Update your contact details, social links, and welcome message.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input value={config.phone || ''} onChange={e => setConfig({...config, phone: e.target.value})} placeholder="+234..." />
              </div>
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input value={config.email || ''} onChange={e => setConfig({...config, email: e.target.value})} placeholder="info@school.com" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Physical Address</Label>
                <Input value={config.address || ''} onChange={e => setConfig({...config, address: e.target.value})} placeholder="123 Education Lane..." />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Welcome Message (Preamble)</Label>
                <Textarea value={config.preamble || ''} onChange={e => setConfig({...config, preamble: e.target.value})} placeholder="Welcome to our school..." />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Hero Image URL</Label>
                <Input value={config.heroImageUrl || ''} onChange={e => setConfig({...config, heroImageUrl: e.target.value})} placeholder="https://..." />
              </div>
            </div>
            <Button onClick={handleConfigSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="carousel">
        <Card>
          <CardHeader>
            <CardTitle>Carousel Slides</CardTitle>
            <CardDescription>Manage the rotating hero images on your landing page. (Coming Soon - Manage via API)</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">You have {data.carouselSlides.length} slides configured.</p>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="events">
        <Card>
          <CardHeader>
            <CardTitle>Public Events</CardTitle>
            <CardDescription>Manage upcoming school events shown on the homepage.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">You have {data.publicEvents.length} upcoming events.</p>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="news">
        <Card>
          <CardHeader>
            <CardTitle>News & Blogs</CardTitle>
            <CardDescription>Publish articles, updates, and school news.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">You have {data.blogPosts.length} published articles.</p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
