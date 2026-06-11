'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Shield, School, Activity, CreditCard, Plus, Loader2, X } from 'lucide-react';
import { createSchool } from '@/actions/super-admin-actions';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function SuperAdminDashboard() {
  const [schools, setSchools] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, trial: 0, expired: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tighter italic">PLATFORM COMMAND</h1>
            <p className="text-neutral-500 font-bold uppercase text-xs tracking-widest mt-1">Proxima Hub • Global Oversight</p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-black font-bold shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:scale-105 transition-all duration-300"
            >
              <Plus className="w-5 h-5" /> Add New School
            </button>
            <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-2xl">
              <Shield className="w-5 h-5 text-emerald-400" />
              <span className="text-sm font-black text-emerald-400 uppercase">Super Admin</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Total Schools', value: stats.total, icon: School, color: 'text-white' },
            { label: 'Active Licenses', value: stats.active, icon: Activity, color: 'text-emerald-400' },
            { label: 'Trial Mode', value: stats.trial, icon: CreditCard, color: 'text-amber-400' },
            { label: 'Expired/Suspended', value: stats.expired, icon: Shield, color: 'text-rose-500' },
          ].map((s, i) => (
            <Card key={i} className="bg-neutral-900 border-white/5">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">{s.label}</p>
                  <p className={`text-3xl font-black mt-1 ${s.color}`}>{isLoading ? '-' : s.value}</p>
                </div>
                <s.icon className={`w-8 h-8 opacity-20 ${s.color}`} />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Schools List */}
        <Card className="bg-neutral-900 border-white/5 overflow-hidden rounded-3xl">
          <CardHeader className="border-b border-white/5 p-8 bg-white/[0.02]">
             <CardTitle className="text-xl font-black italic">Manage Tenants</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-[10px] font-black text-neutral-500 uppercase tracking-widest">
                      <th className="px-8 py-6">School Name</th>
                      <th className="px-8 py-6">Subdomain</th>
                      <th className="px-8 py-6">Status</th>
                      <th className="px-8 py-6">Expires At</th>
                      <th className="px-8 py-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schools.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-8 py-10 text-center text-neutral-500">
                          No schools found. Create one to get started.
                        </td>
                      </tr>
                    ) : (
                      schools.map((school) => (
                        <tr key={school.id} className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors group">
                          <td className="px-8 py-6">
                            <div className="font-bold text-neutral-200">{school.name}</div>
                            <div className="text-[10px] text-neutral-600 font-medium">{school.slug}</div>
                          </td>
                          <td className="px-8 py-6">
                            <code className="text-xs font-mono text-emerald-500/70 bg-emerald-500/5 px-2 py-1 rounded-md">
                              {school.subdomain}.proximahub.com
                            </code>
                          </td>
                          <td className="px-8 py-6">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                              school.licenseStatus === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' :
                              school.licenseStatus === 'TRIAL' ? 'bg-amber-500/10 text-amber-500' :
                              'bg-rose-500/10 text-rose-500'
                            }`}>
                              {school.licenseStatus}
                            </span>
                          </td>
                          <td className="px-8 py-6 text-sm font-medium text-neutral-400">
                            {new Date(school.expiresAt).toLocaleDateString()}
                          </td>
                          <td className="px-8 py-6 text-right">
                            <button className="text-xs font-black text-emerald-500 hover:underline">Edit</button>
                            <span className="mx-2 text-neutral-800">|</span>
                            <button className="text-xs font-black text-rose-500 hover:underline">Suspend</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create School Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-neutral-900 border border-white/10 p-8 rounded-3xl w-full max-w-lg shadow-2xl relative">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-6 right-6 text-neutral-500 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              
              <h2 className="text-2xl font-black mb-6 flex items-center gap-2 italic">
                <School className="text-emerald-500 w-6 h-6" /> Add New School
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="text-xs font-bold text-neutral-400 uppercase">School Name *</label>
                  <input 
                    name="name" 
                    value={formData.name} 
                    onChange={handleInputChange} 
                    required 
                    placeholder="e.g. King's College"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 mt-1 outline-none text-white focus:border-emerald-500" 
                  />
                </div>
                
                <div>
                  <label className="text-xs font-bold text-neutral-400 uppercase">Subdomain *</label>
                  <div className="relative mt-1">
                    <input 
                      name="subdomain" 
                      value={formData.subdomain} 
                      onChange={handleInputChange} 
                      required 
                      placeholder="kingscollege"
                      className="w-full bg-black/50 border border-white/10 rounded-xl pl-4 pr-40 py-3 outline-none text-white focus:border-emerald-500 font-mono" 
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm font-mono pointer-events-none">
                      .proximahub.com
                    </div>
                  </div>
                  <p className="text-[10px] text-neutral-500 mt-1">Only lowercase letters, numbers, and hyphens.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-neutral-400 uppercase">Primary Color *</label>
                    <div className="flex items-center mt-1 gap-3 bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus-within:border-emerald-500">
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
                        className="bg-transparent border-none outline-none text-white w-full uppercase font-mono text-sm" 
                        pattern="^#[0-9A-Fa-f]{6}$"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-xs font-bold text-neutral-400 uppercase">Secondary Color *</label>
                    <div className="flex items-center mt-1 gap-3 bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus-within:border-emerald-500">
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
                        className="bg-transparent border-none outline-none text-white w-full uppercase font-mono text-sm" 
                        pattern="^#[0-9A-Fa-f]{6}$"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-400 uppercase">Trial Period (Days) *</label>
                  <input 
                    type="number" 
                    name="trialDays" 
                    min="1"
                    value={formData.trialDays} 
                    onChange={handleInputChange} 
                    required 
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 mt-1 outline-none text-white focus:border-emerald-500" 
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-white/10">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)} 
                    className="flex-1 py-3 border border-white/10 rounded-xl font-semibold hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="flex-1 py-3 bg-white text-black rounded-xl font-bold hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
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
      </div>
    </div>
  );
}
