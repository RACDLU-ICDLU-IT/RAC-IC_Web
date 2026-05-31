import { supabase } from '../../supabase';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Bell, CheckCircle2, Circle, AlertCircle, Clock } from 'lucide-react';
import { useTenant } from '../../hooks/useTenant';

export default function DashboardReminders() {
  const { user, profile } = useAuth();
  const { tenant } = useTenant();
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !profile) return;
    
    // Admins can see all reminders, members see 'all' and their specific role
    const isAdminOrMaster = ['admin', 'master_admin'].includes(profile.role || '');
    let q = supabase.from('reminders').select('*').eq('tenant_id', tenant.id).order('due_date', { ascending: true });
    if (!isAdminOrMaster) {
      q = q.in('target_role', ['all members', 'all', profile.role || 'member']);
    }

    q.then(({ data: snap }) => {
        setReminders(snap || []);
        setLoading(false);
      }, err => {
        console.error(err);
        setLoading(false);
      });
  }, [user, profile, tenant.id]);

  if (loading) {
    return <div className="p-12 flex justify-center"><div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" /></div>;
  }

  const getDueBadge = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate + 'T23:59:59');
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { label: 'Overdue', cls: 'bg-red-100 text-red-700', icon: <AlertCircle size={12} /> };
    if (diffDays === 0) return { label: 'Due Today', cls: 'bg-amber-100 text-amber-700', icon: <Clock size={12} /> };
    if (diffDays <= 3) return { label: `${diffDays}d left`, cls: 'bg-amber-50 text-amber-600', icon: <Clock size={12} /> };
    return { label: `Due: ${new Date(dueDate + 'T00:00:00').toLocaleDateString()}`, cls: 'bg-gray-100 text-gray-500', icon: <Clock size={12} /> };
  };

  return (
    <div className="animate-fade-in-up max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-bold text-gray-900 flex items-center gap-3">
          <Bell className="text-accent" /> Reminders & Tasks
        </h1>
        <p className="text-gray-500 mt-1 text-sm">Keep track of upcoming club deadlines and notices.</p>
      </div>

      <div className="space-y-8">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex items-center justify-between">
            <h2 className="font-heading font-bold text-xl flex items-center gap-2">
              Club Reminders
              <span className="bg-primary text-white text-xs px-2 py-0.5 rounded-full">{reminders.length}</span>
            </h2>
          </div>
          
          {reminders.length === 0 ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center">
              <CheckCircle2 size={48} className="text-green-400 mb-4 opacity-50" />
              <p>No reminders at the moment!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {reminders.map(reminder => {
                const badge = getDueBadge(reminder.due_date || reminder.dueDate);
                return (
                  <div key={reminder.id} className="p-4 md:p-6 flex items-start gap-4 hover:bg-gray-50 transition-colors">
                    <div className="mt-1 shrink-0 text-accent bg-accent/10 p-2 rounded-full">
                      <Bell size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-bold text-gray-900 text-lg">{reminder.title}</h3>
                        <span className={`flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>
                          {badge.icon} {badge.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{reminder.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
