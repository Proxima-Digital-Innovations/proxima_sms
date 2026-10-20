'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield, PlusCircle, Trash2, Edit, ShieldCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { getAccessRoles, getAllPermissions, createAccessRole, updateAccessRole, deleteAccessRole } from '@/actions/rbac-actions';

export default function RolesPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Form State
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const pRes = await getAllPermissions();
    if (pRes.success && pRes.data) setPermissions(pRes.data);
    
    const rRes = await getAccessRoles();
    if (rRes.success && rRes.data) setRoles(rRes.data);
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setSelectedPermissions([]);
    setEditingRoleId(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (role: any) => {
    setEditingRoleId(role.id);
    setName(role.name);
    setDescription(role.description || '');
    setSelectedPermissions(role.permissions.map((p: any) => p.id));
    setIsEditModalOpen(true);
  };

  const togglePermission = (permId: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permId) ? prev.filter(id => id !== permId) : [...prev, permId]
    );
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRoleId) {
        const res = await updateAccessRole(editingRoleId, { name, description, permissionIds: selectedPermissions });
        if (res.success) {
          toast({ title: 'Role Updated', description: 'Permissions saved successfully.' });
          setIsEditModalOpen(false);
        } else throw new Error(res.error);
      } else {
        const res = await createAccessRole({ name, description, permissionIds: selectedPermissions });
        if (res.success) {
          toast({ title: 'Role Created', description: 'New role established.' });
          setIsModalOpen(false);
        } else throw new Error(res.error);
      }
      fetchData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure? Users with this role will lose these permissions.')) return;
    const res = await deleteAccessRole(id);
    if (res.success) {
      toast({ title: 'Role Deleted', description: 'Role removed successfully.' });
      fetchData();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: res.error });
    }
  };

  // Group permissions by resource for easier viewing in the UI
  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.resource]) acc[perm.resource] = [];
    acc[perm.resource].push(perm);
    return acc;
  }, {} as Record<string, any[]>);

  const RoleForm = () => (
    <form onSubmit={handleSaveRole} className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label htmlFor="name">Role Name</Label>
        <Input id="name" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Disciplinary Committee" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description of this role" />
      </div>
      
      <div className="space-y-2 mt-4">
        <Label>System Permissions</Label>
        <p className="text-xs text-muted-foreground mb-2">Check the permissions to grant this role access to specific system features.</p>
        <div className="border rounded-md p-4 bg-background max-h-[400px] overflow-y-auto space-y-6">
          {Object.entries(groupedPermissions).map(([resource, perms]) => (
            <div key={resource} className="space-y-2">
              <h4 className="font-semibold text-slate-700 capitalize border-b pb-1">{resource.replace(/_/g, ' ')}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-2">
                {(perms as any[]).map((perm: any) => (
                  <div key={perm.id} className="flex items-start space-x-2">
                    <Checkbox 
                      id={perm.id} 
                      className="mt-1"
                      checked={selectedPermissions.includes(perm.id)} 
                      onCheckedChange={() => togglePermission(perm.id)} 
                    />
                    <div className="grid gap-1.5 leading-none">
                      <Label htmlFor={perm.id} className="font-medium cursor-pointer capitalize">
                        {perm.action}
                      </Label>
                      <p className="text-xs text-muted-foreground">{perm.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end pt-4 gap-2">
        <Button type="button" variant="outline" onClick={() => { setIsModalOpen(false); setIsEditModalOpen(false); }}>Cancel</Button>
        <Button type="submit" className="bg-indigo-600">Save Role</Button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Access Roles & Permissions</h1>
          <p className="text-muted-foreground mt-1">
            Create custom roles by grouping predefined system permissions, then assign these roles to staff.
          </p>
        </div>
        
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleOpenCreate}>
              <PlusCircle className="mr-2 h-4 w-4" />
              New Role
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Access Role</DialogTitle>
              <DialogDescription>Define a new role and select its permissions.</DialogDescription>
            </DialogHeader>
            <RoleForm />
          </DialogContent>
        </Dialog>

        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Access Role</DialogTitle>
              <DialogDescription>Modify permissions assigned to this role.</DialogDescription>
            </DialogHeader>
            <RoleForm />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader className="bg-background border-b border-slate-100 pb-4">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Shield className="h-5 w-5 text-indigo-500" />
            Configured Roles
          </CardTitle>
          <CardDescription>Roles that can be assigned to users to grant them specific access across the ERP.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-background">
              <TableRow>
                <TableHead>Role Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Total Permissions</TableHead>
                <TableHead>Assigned Users</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map(role => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-indigo-600" />
                      {role.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{role.description}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                      {role.permissions.length} Permissions
                    </span>
                  </TableCell>
                  <TableCell>{role._count?.users || 0}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(role)} className="text-indigo-500">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(role.id)} className="text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {roles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No custom roles defined.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
