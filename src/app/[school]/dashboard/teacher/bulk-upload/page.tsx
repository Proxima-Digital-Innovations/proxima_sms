
'use client';

import { BulkUploadForm } from '@/components/dashboard/teacher/bulk-upload-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function BulkUploadPage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="font-headline text-3xl font-bold">Bulk Document Upload</h1>
                <p className="text-muted-foreground">
                    Upload multiple lesson plans or exam questions at once.
                </p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Migration Assistant</CardTitle>
                    <CardDescription>
                        Select multiple files from your computer, fill in the required details for each, and submit them all in one batch.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <BulkUploadForm />
                </CardContent>
            </Card>
        </div>
    );
}
