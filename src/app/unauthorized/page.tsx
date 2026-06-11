
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center">
      <div className="max-w-md space-y-6">
        <div className="flex justify-center">
          <div className="p-4 bg-red-100 rounded-full">
            <ShieldAlert className="h-12 w-12 text-red-600" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Access Denied</h1>
          <p className="text-slate-500 font-medium">
            You do not have permission to access this resource. This could be due to a tenant mismatch or insufficient role privileges.
          </p>
        </div>
        <Button asChild className="w-full h-11 rounded-xl bg-slate-900 font-bold">
          <Link href="/login">Return to Login</Link>
        </Button>
      </div>
    </div>
  );
}
