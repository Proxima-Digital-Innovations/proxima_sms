'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { doc, getDoc, setDoc } from '@/lib/firebase-stubs';
import { db, auth, storage } from "@/lib/firebase";
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Wrench } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function MaintenancePage() {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchMaintenanceStatus = async () => {
      setIsLoading(true);
      try {
        const settingsDocRef = doc(db, 'system', 'settings');
        const docSnap = await getDoc(settingsDocRef);
        if (docSnap.exists()) {
          setIsMaintenanceMode(docSnap.data().maintenanceMode || false);
        }
      } catch (error) {
        console.error("Error fetching maintenance status:", error);
        toast({ variant: 'destructive', title: "Error", description: "Could not load maintenance status." });
      } finally {
        setIsLoading(false);
      }
    };

    fetchMaintenanceStatus();
  }, [toast]);

  const handleToggleMaintenance = async (checked: boolean) => {
    try {
      const settingsDocRef = doc(db, 'system', 'settings');
      await setDoc(settingsDocRef, { maintenanceMode: checked }, { merge: true });
      setIsMaintenanceMode(checked);
      toast({
        title: `Maintenance Mode ${checked ? 'Activated' : 'Deactivated'}`,
        description: `The portal is now ${checked ? 'in' : 'out of'} maintenance mode.`,
      });
    } catch (error) {
      console.error("Error toggling maintenance mode:", error);
      toast({ variant: 'destructive', title: "Error", description: "Could not update maintenance status." });
    }
  };

  return (
    <div className="space-y-8">
       <div>
        <h1 className="font-headline text-3xl font-bold">Maintenance Mode</h1>
        <p className="text-muted-foreground">
          Activate or deactivate maintenance mode for the entire portal.
        </p>
      </div>
      
        <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Critical Action</AlertTitle>
            <AlertDescription>
                Activating maintenance mode will prevent users from performing any data-modifying actions like uploads, submissions, or approvals. Use this when you need to perform system updates or data migration.
            </AlertDescription>
        </Alert>

       <Card>
        <CardHeader>
          <CardTitle>Control Panel</CardTitle>
          <CardDescription>
            Use the switch below to turn maintenance mode on or off.
          </CardDescription>
        </CardHeader>
        <CardContent>
           {isLoading ? (
                <Skeleton className="h-10 w-48" />
           ) : (
             <div className="flex items-center space-x-4 rounded-lg border p-4">
                <Wrench className="h-6 w-6" />
                <div className="flex-1 space-y-1">
                    <Label htmlFor="maintenance-mode-switch" className="text-base font-medium">
                        Activate Maintenance Mode
                    </Label>
                    <p className="text-sm text-muted-foreground">
                        This will restrict write access for all non-admin users.
                    </p>
                </div>
                <Switch
                    id="maintenance-mode-switch"
                    checked={isMaintenanceMode}
                    onCheckedChange={handleToggleMaintenance}
                    aria-label="Toggle Maintenance Mode"
                />
            </div>
           )}
        </CardContent>
      </Card>
    </div>
  );
}
