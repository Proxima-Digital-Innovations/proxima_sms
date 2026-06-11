
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/context/theme-context';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export default function SettingsPage() {
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();


  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = () => {
    if (!installPrompt) {
        toast({
            title: 'App Already Installed',
            description: 'The SCHOOL Portal is already installed on your device or not supported by your browser.',
        });
        return;
    }
    
    (installPrompt as any).prompt();
    (installPrompt as any).userChoice.then((choiceResult: { outcome: 'accepted' | 'dismissed' }) => {
        if (choiceResult.outcome === 'accepted') {
            toast({
                title: 'Installation Successful',
                description: 'The app has been added to your home screen.',
            });
        }
        setInstallPrompt(null);
    });
  };


  return (
    <div className="space-y-8">
       <div>
        <h1 className="font-headline text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and application settings.
        </p>
      </div>

       <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Customize the look and feel of the application.
          </CardDescription>
        </CardHeader>
        <CardContent>
           <div className="flex items-center space-x-2">
            <Switch
                id="dark-mode"
                checked={theme === 'dark'}
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
            />
            <Label htmlFor="dark-mode">Dark Mode</Label>
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Install Application</CardTitle>
          <CardDescription>
            Install the SCHOOL Portal on your device for a better experience, including offline access and notifications.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleInstallClick}>
            <Download className="mr-2 h-4 w-4" />
            Install App
          </Button>
        </CardContent>
      </Card>

    </div>
  );
}
