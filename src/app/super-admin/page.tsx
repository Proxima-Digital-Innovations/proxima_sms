'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Shield, School, Activity, CreditCard, Plus, Loader2, X, Settings2, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createSchool, updateSchoolLicense } from '@/actions/super-admin-actions';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard-layout';

export default function SuperAdminDashboard() {
  const [schools, setSchools] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, trial: 0, expired: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<any>(null);
  const { toast } = useToast();
  const router = useRouter();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    subdomain: '',
    primaryColor: '#0f172a',
    secondaryColor: '#10b981',
    trialDays: 30
  });

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      const response = await fetch('/api/super-admin/schools');
      if (response.ok) {
        const data = await response.json();
        setSchools(data);
        setStats({
          total: data.length,
          active: data.filter((s: any) => s.licenseStatus === 'ACTIVE').length,
          trial: data.filter((s: any) => s.licenseStatus === 'TRIAL').length,
          expired: data.filter((s: any) => s.licenseStatus === 'EXPIRED' || s.licenseStatus === 'SUSPENDED').length,
        });
      }
    } catch (error) {
      console.error('Error fetching schools:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const res = await createSchool(formData);
      
      if (res.success) {
        toast({ title: 'Success', description: 'School created successfully' });
        setIsModalOpen(false);
        setFormData({ name: '', subdomain: '', primaryColor: '#0f172a', secondaryColor: '#10b981', trialDays: 30 });
        await fetchSchools();
        router.refresh();
      } else {
        toast({ variant: 'destructive', title: 'Error', description: res.error || 'Failed to create school' });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'An unexpected error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (school: any) => {
    let activeModules: string[] = ["CORE"];
    if (Array.isArray(school.activeModules)) {
      activeModules = school.activeModules;
    } else if (typeof school.activeModules === "string") {
      try {
        activeModules = JSON.parse(school.activeModules);
      } catch {
        activeModules = ["CORE"];
      }
    }

    const expiresAtStr = school.expiresAt && !isNaN(new Date(school.expiresAt).getTime())
      ? new Date(school.expiresAt).toISOString().split('T')[0]
      : '';

    setSelectedSchool({
        ...school,
        activeModules,
        expiresAt: expiresAtStr
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
          const expiryDate = selectedSchool.expiresAt
            ? new Date(selectedSchool.expiresAt).toISOString()
            : new Date(Date.now() + 365 * 86400000).toISOString();

          const res = await updateSchoolLicense({
              licenseStatus: selectedSchool.licenseStatus || 'ACTIVE',
              expiresAt: expiryDate,
              activeModules: selectedSchool.activeModules || ["CORE"]
          });
          if (res.success) {
              toast({ title: 'Success', description: 'License updated successfully' });
              setIsEditModalOpen(false);
              await fetchSchools();
              router.refresh();
          } else {
              toast({ variant: 'destructive', title: 'Error', description: (res as any).error });
          }
      } catch(err) {
          toast({ variant: 'destructive', title: 'Error', description: 'Failed to update license' });
      } finally {
          setIsSubmitting(false);
      }
  };

  const toggleModule = (mod: string) => {
      setSelectedSchool((prev: any) => ({
          ...prev,
          activeModules: prev.activeModules.includes(mod)
            ? prev.activeModules.filter((m: string) => m !== mod)
            : [...prev.activeModules, mod]
      }));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Platform Command</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage all tenant schools and licenses</p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add New School
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Total Schools', value: stats.total, icon: School, color: 'text-white', bg: 'bg-blue-600' },
            { label: 'Active Licenses', value: stats.active, icon: Activity, color: 'text-white', bg: 'bg-green-600' },
            { label: 'Trial Mode', value: stats.trial, icon: CreditCard, color: 'text-white', bg: 'bg-amber-500' },
            { label: 'Expired/Suspended', value: stats.expired, icon: Shield, color: 'text-white', bg: 'bg-red-600' },
          ].map((s, i) => (
            <div key={i} className="standard-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{s.label}</p>
                  <p className="text-3xl font-bold mt-2 text-foreground">{isLoading ? '-' : s.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${s.bg}`}>
                  <s.icon className={`w-6 h-6 ${s.color}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Schools List */}
        <div className="data-table-container">
          <div className="border-b border-border p-4 bg-background">
             <h2 className="text-lg font-semibold tracking-tight text-foreground">Manage Tenants</h2>
          </div>
          <div className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      <th className="px-6 py-4">School Name</th>
                      <th className="px-6 py-4">Subdomain</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Expires At</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schools.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">
                          No schools found. Create one to get started.
                        </td>
                      </tr>
                    ) : (
                      schools.map((school) => (
                        <tr key={school.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-foreground">{school.name}</div>
                            <div className="text-[10px] text-muted-foreground">{school.slug}</div>
                          </td>
                          <td className="px-6 py-4">
                            <code className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded-md border border-border">
                              {school.subdomain}.proximahub.com
                            </code>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                              school.licenseStatus === 'ACTIVE' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' :
                              school.licenseStatus === 'TRIAL' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20' :
                              'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                            }`}>
                              {school.licenseStatus}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-muted-foreground">
                            {school.expiresAt && !isNaN(new Date(school.expiresAt).getTime())
                              ? new Date(school.expiresAt).toLocaleDateString()
                              : 'Never'}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button onClick={() => openEditModal(school)} className="text-xs font-semibold text-primary hover:underline transition-colors">Manage License</button>
                            <span className="mx-2 text-muted-foreground">|</span>
                            <button className="text-xs font-semibold text-destructive hover:underline transition-colors">Suspend</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Create School Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-card border border-border text-card-foreground p-8 rounded-xl shadow-xl w-full max-w-lg relative animate-slide-down">
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="absolute top-6 right-6 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2 text-foreground">
                <School className="text-primary w-6 h-6" /> Add New School
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">School Name *</label>
                  <input 
                    name="name" 
                    value={formData.name} 
                    onChange={handleInputChange} 
                    required 
                    placeholder="e.g. King's College"
                    className="w-full bg-background border border-input rounded-lg px-4 py-3 mt-1 outline-none text-foreground focus:border-primary focus:ring-1 focus:ring-primary" 
                  />
                </div>
                
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Subdomain *</label>
                  <div className="relative mt-1">
                    <input 
                      name="subdomain" 
                      value={formData.subdomain} 
                      onChange={handleInputChange} 
                      required 
                      placeholder="kingscollege"
                      className="w-full bg-background border border-input rounded-lg pl-4 pr-40 py-3 outline-none text-foreground focus:border-primary focus:ring-1 focus:ring-primary font-mono" 
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-mono pointer-events-none">
                      .proximahub.com
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Only lowercase letters, numbers, and hyphens.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Primary Color *</label>
                    <div className="flex items-center mt-1 gap-3 bg-background border border-input rounded-lg px-4 py-3 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
                      <input 
                        type="color" 
                        name="primaryColor" 
                        value={formData.primaryColor} 
                        onChange={handleInputChange} 
                        className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 p-0" 
                      />
                      <input 
                        name="primaryColor" 
                        value={formData.primaryColor} 
                        onChange={handleInputChange} 
                        className="bg-transparent border-none outline-none text-foreground w-full uppercase font-mono text-sm" 
                        pattern="^#[0-9A-Fa-f]{6}$"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Secondary Color *</label>
                    <div className="flex items-center mt-1 gap-3 bg-background border border-input rounded-lg px-4 py-3 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
                      <input 
                        type="color" 
                        name="secondaryColor" 
                        value={formData.secondaryColor} 
                        onChange={handleInputChange} 
                        className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 p-0" 
                      />
                      <input 
                        name="secondaryColor" 
                        value={formData.secondaryColor} 
                        onChange={handleInputChange} 
                        className="bg-transparent border-none outline-none text-foreground w-full uppercase font-mono text-sm" 
                        pattern="^#[0-9A-Fa-f]{6}$"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Trial Period (Days) *</label>
                  <input 
                    type="number" 
                    name="trialDays" 
                    min="1"
                    value={formData.trialDays} 
                    onChange={handleInputChange} 
                    required 
                    className="w-full bg-background border border-input rounded-lg px-4 py-3 mt-1 outline-none text-foreground focus:border-primary focus:ring-1 focus:ring-primary" 
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-border">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)} 
                    className="flex-1 py-3 border border-input rounded-lg font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-70 flex justify-center items-center gap-2"
                  >
                    {isSubmitting ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Provisioning...</>
                    ) : (
                      'Create School'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit License Modal */}
        {isEditModalOpen && selectedSchool && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-card border border-border text-card-foreground p-8 rounded-xl shadow-xl w-full max-w-lg relative animate-slide-down">
              <button 
                onClick={() => setIsEditModalOpen(false)} 
                className="absolute top-6 right-6 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2 text-foreground">
                <Settings2 className="text-primary w-6 h-6" /> Manage License
              </h2>
              
              <form onSubmit={handleEditSubmit} className="space-y-5">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">School Name</label>
                  <input 
                    value={selectedSchool.name} 
                    disabled 
                    className="w-full bg-muted border border-input rounded-lg px-4 py-3 mt-1 outline-none text-muted-foreground" 
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Status</label>
                    <select 
                        value={selectedSchool.licenseStatus}
                        onChange={(e) => setSelectedSchool({...selectedSchool, licenseStatus: e.target.value})}
                        className="w-full bg-background border border-input rounded-lg px-4 py-3 mt-1 outline-none text-foreground focus:border-primary focus:ring-1 focus:ring-primary appearance-none"
                    >
                        <option value="TRIAL">TRIAL</option>
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="EXPIRED">EXPIRED</option>
                        <option value="SUSPENDED">SUSPENDED</option>
                    </select>
                    </div>

                    <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1"><CalendarDays className="w-3 h-3"/> Expiry Date</label>
                    <input 
                        type="date"
                        value={selectedSchool.expiresAt}
                        onChange={(e) => setSelectedSchool({...selectedSchool, expiresAt: e.target.value})}
                        className="w-full bg-background border border-input rounded-lg px-4 py-[11px] mt-1 outline-none text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                    </div>
                </div>

                <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">Active Modules</label>
                    <div className="grid grid-cols-2 gap-2">
                        {['CORE', 'FINANCE', 'LMS', 'CMS', 'BAMS'].map(mod => (
                            <label key={mod} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedSchool.activeModules.includes(mod) ? 'bg-primary/10 border-primary/40' : 'bg-card border-border hover:border-muted-foreground/40'}`}>
                                <input 
                                    type="checkbox" 
                                    className="accent-primary w-4 h-4" 
                                    checked={selectedSchool.activeModules.includes(mod)}
                                    onChange={() => toggleModule(mod)}
                                />
                                <span className="text-sm font-semibold text-foreground">{mod}</span>
                            </label>
                        ))}
                    </div>
                </div>
                
                <div className="flex gap-3 pt-4 border-t border-border">
                  <button 
                    type="button" 
                    onClick={() => setIsEditModalOpen(false)} 
                    className="flex-1 py-3 border border-input rounded-lg font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-70 flex justify-center items-center gap-2"
                  >
                    {isSubmitting ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Saving...</>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
