'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign } from "lucide-react";

export default function ParentPaymentsPage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="font-headline text-3xl font-bold">Fee Payments</h1>
                <p className="text-muted-foreground">
                    View invoices and make payments online.
                </p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Online Payment Portal</CardTitle>
                    <CardDescription>
                       This section will allow parents to securely pay school fees online using various payment methods. You will be able to view outstanding invoices, payment history, and print receipts directly from the portal.
                       <br /><br />
                        <strong className="text-primary">This feature is currently in development and will be available once the project is approved.</strong>
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
                         <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                             <DollarSign className="h-8 w-8 text-primary" />
                         </div>
                        <h3 className="text-lg font-semibold">Online Payments Are Coming Soon</h3>
                        <p className="text-sm text-muted-foreground mt-2">
                           An interface to view invoices and make payments will be available here.
                        </p>
                        <Button disabled className="mt-4">
                            Pay Fees
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
