'use client';

import { useState, useEffect } from 'react';
import { useRole } from '@/context/role-context';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { changeOwnPassword } from '@/actions/user-actions';

export function ForcePasswordChangeModal() {
  const { user, requiresPasswordChange } = useRole();
  const { update } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  
  const [open, setOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && requiresPasswordChange) {
      const dismissed = sessionStorage.getItem('password-modal-dismissed');
      if (!dismissed) {
        setOpen(true);
      }
    }
  }, [user, requiresPasswordChange]);

  // If not logged in, or doesn't require change, return null
  if (!user || !requiresPasswordChange) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters long', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Error', description: 'Passwords do not match', variant: 'destructive' });
      return;
    }

    setLoading(true);
    const res = await changeOwnPassword(user.id, newPassword);
    
    if (res.success) {
      toast({ title: 'Success', description: 'Password updated successfully!' });
      await update({ requiresPasswordChange: false });
      window.location.reload(); 
    } else {
      toast({ title: 'Error', description: res.error || 'Failed to update password', variant: 'destructive' });
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem('password-modal-dismissed', 'true');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val) handleDismiss();
      else setOpen(true);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl text-destructive">Security Alert: Default Password</DialogTitle>
          <DialogDescription>
            You are currently using a default or reset password. For security reasons, please change your password. You can dismiss this reminder, but it will appear again next time you log in.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input 
              id="new-password"
              type="password" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input 
              id="confirm-password"
              type="password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
            />
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <Button type="button" variant="outline" onClick={handleDismiss}>
                Remind Me Later
            </Button>
            <Button type="submit" disabled={loading}>
                {loading ? 'Updating...' : 'Update Password'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
