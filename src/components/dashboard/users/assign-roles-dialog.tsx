'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { getAccessRoles, assignRolesToUser } from '@/actions/rbac-actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Role {
  id: string;
  name: string;
  description: string | null;
}

interface AssignRolesDialogProps {
  user: any;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AssignRolesDialog({ user, isOpen, onOpenChange, onSuccess }: AssignRolesDialogProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && user) {
      // Pre-select existing roles
      if (user.accessRoles) {
        setSelectedRoleIds(user.accessRoles.map((r: any) => r.id));
      } else {
        setSelectedRoleIds([]);
      }
      
      // Fetch available roles
      setIsLoading(true);
      getAccessRoles()
        .then((res) => {
          if (res.success && res.data) {
            setRoles(res.data);
          } else {
            toast({
              title: 'Error',
              description: 'Failed to load roles',
              variant: 'destructive',
            });
          }
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, user]);

  // Reset search when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  const filteredRoles = roles.filter(role => 
    role.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (role.description && role.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleToggleRole = (roleId: string) => {
    setSelectedRoleIds(prev => 
      prev.includes(roleId) ? prev.filter(id => id !== roleId) : [...prev, roleId]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await assignRolesToUser(user.id, selectedRoleIds);
      if (res.success) {
        toast({
          title: 'Success',
          description: `Roles updated for ${user.firstName} ${user.lastName}`,
        });
        onSuccess();
        onOpenChange(false);
      } else {
        throw new Error(res.error || 'Failed to update roles');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Assign Custom Roles
          </DialogTitle>
          <DialogDescription>
            Grant specific system permissions to <strong>{user?.firstName} {user?.lastName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : roles.length === 0 ? (
            <div className="text-center p-4 text-muted-foreground">
              No custom roles have been created yet. <br/>
              Go to System Config &gt; Roles to create them.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search roles..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <ScrollArea className="h-[250px] pr-4">
                <div className="space-y-4">
                  {filteredRoles.length === 0 ? (
                    <div className="text-center p-4 text-sm text-muted-foreground">
                      No roles found matching "{searchQuery}"
                    </div>
                  ) : (
                    filteredRoles.map((role) => (
                      <div key={role.id} className="flex items-start space-x-3 p-3 rounded-md border bg-background hover:bg-slate-100 transition-colors">
                        <Checkbox 
                          id={`role-${role.id}`} 
                          checked={selectedRoleIds.includes(role.id)}
                          onCheckedChange={() => handleToggleRole(role.id)}
                          className="mt-1"
                        />
                        <div className="grid gap-1.5 leading-none">
                          <label 
                            htmlFor={`role-${role.id}`} 
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {role.name}
                          </label>
                          <p className="text-sm text-muted-foreground">
                            {role.description}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Assignments
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
