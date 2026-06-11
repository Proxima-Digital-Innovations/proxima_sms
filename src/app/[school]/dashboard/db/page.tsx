
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Upload, ServerCrash, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { dbService } from '@/lib/dbService';

export default function DatabasePage() {
    const { toast } = useToast();

    const handleBackup = async () => {
        toast({
            title: "Preparing Backup...",
            description: "This may take a few moments.",
        });

        const collectionsToBackup = ['users', 'lessonNotes', 'examQuestions', 'notifications', 'departments', 'classes', 'subjects', 'auditLog', 'scores', 'students'];
        const backupData: { [key: string]: any[] } = {};
        
        try {
            for (const collectionName of collectionsToBackup) {
                backupData[collectionName] = await dbService.getDocs(collectionName);
            }

            const jsonString = JSON.stringify(backupData, null, 2);
            const blob = new Blob([jsonString], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `insight-connect-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            toast({
                title: "Backup Successful!",
                description: "Your data has been downloaded.",
            });

        } catch (error) {
            console.error("Backup failed:", error);
            toast({
                variant: "destructive",
                title: "Backup Failed",
                description: "Could not export database contents.",
            });
        }
    };

    const handleRestore = () => {
        toast({
            variant: "destructive",
            title: "Feature Not Implemented",
            description: "Database restore functionality is a high-risk operation and must be handled with care via the Firebase Console or a secure backend process.",
        });
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="font-headline text-3xl font-bold">Database Management</h1>
                <p className="text-muted-foreground">
                    Perform database backups and manage data restoration.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Data Backup</CardTitle>
                    <CardDescription>
                        It is recommended to perform regular backups of the school's data. Backups will be downloaded as a secure JSON file containing all major collections.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={handleBackup}>
                        <Download className="mr-2 h-4 w-4" />
                        Backup Database
                    </Button>
                </CardContent>
            </Card>

             <Card className="border-destructive/50">
                <CardHeader>
                    <CardTitle className="text-destructive flex items-center gap-2">
                        <ServerCrash />
                        <span>Data Restore</span>
                    </CardTitle>
                    <CardDescription>
                       Restore the database from a backup file. This is a critical action and should only be performed by authorized personnel from the Firebase Console. This action cannot be undone.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                     <Button variant="destructive" onClick={handleRestore}>
                        <Upload className="mr-2 h-4 w-4" />
                        Restore from Backup
                    </Button>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Data Synchronization</CardTitle>
                    <CardDescription>
                       If you are experiencing data inconsistencies, you can try to force a refresh of the local cache. This is generally not needed.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                     <Button variant="outline" onClick={() => window.location.reload()}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh Application Data
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
