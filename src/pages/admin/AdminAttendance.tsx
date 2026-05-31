import { supabase } from '../../supabase';
import React, { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../contexts/AuthContext';
import { Download, CalendarPlus, Search, List, CalendarDays } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Modal } from '../../components/ui/Modal';
import { useAdminTenant } from '../../hooks/useAdminTenant';

export default function AdminAttendance() {
  const { adminTenant: tenant } = useAdminTenant();
  const { user } = useAuth();
  const [mode, setMode] = useState<'mark'|'history'|'member'>('mark');
  const [events, setEvents] = useState<any[]>([]);
  const [activeMembers, setActiveMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchParams] = useSearchParams();
  const targetMemberId = searchParams.get('memberId');

  const [memberHistoryRecords, setMemberHistoryRecords] = useState<any[]>([]);
  const [memberHistoryLoading, setMemberHistoryLoading] = useState(false);
  const [targetMember, setTargetMember] = useState<any>(null);
  
  // Mark Attendance state
  const [selectedEventId, setSelectedEventId] = useState('');
  const [attendanceSheet, setAttendanceSheet] = useState<Record<string, string>>({}); // userId -> status
  const [isSaving, setIsSaving] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickEventTitle, setQuickEventTitle] = useState('');
  const [quickEventDate, setQuickEventDate] = useState('');

  // View History state
  const [historyEventId, setHistoryEventId] = useState('');
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);
  const [isEditingHistory, setIsEditingHistory] = useState(false);
  
  const { addToast } = useToast();

  const loadBaseData = async () => {
    setLoading(true);
    try {
      const { data: eSnap } = await supabase.from('events').select('*').eq('tenant_id', tenant.id).order('date', { ascending: false });
      setEvents(eSnap || []);
      
      const { data: mSnap } = await supabase.from('users').select('*').eq('tenant_id', tenant.id).eq('status', 'active');
      setActiveMembers(mSnap || []);
    } catch(err) {
      console.error(err);
      addToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBaseData();
  }, [tenant.id]);

  const loadEventAttendance = async (eventId: string, setSheet: boolean = true) => {
    if (!eventId) {
      if (setSheet) setAttendanceSheet({});
      return [];
    }
    try {
      const { data: snap } = await supabase.from('attendance').select('*').eq('tenant_id', tenant.id).eq('eventId', eventId);
      const records = snap || [];
      
      if (setSheet) {
        const sheet: Record<string, string> = {};
        records.forEach(r => sheet[r.userId] = r.status);
        setAttendanceSheet(sheet);
      }
      return records;
    } catch(err) {
      console.error(err);
      addToast('Failed to load attendance records', 'error');
      return [];
    }
  };

  useEffect(() => {
    if (mode === 'mark') {
      loadEventAttendance(selectedEventId, true);
    }
  }, [selectedEventId, mode, tenant.id]);

  useEffect(() => {
    if (mode === 'history' && historyEventId) {
      loadEventAttendance(historyEventId, false).then(recs => setHistoryRecords(recs));
    }
  }, [historyEventId, mode, tenant.id]);

  const fetchMemberHistory = async (memberId: string) => {
    setMemberHistoryLoading(true);
    try {
      const { data: snap } = await supabase
        .from('attendance')
        .select('*')
        .eq('userId', memberId)
        .eq('tenant_id', tenant.id);

      const records = snap || [];

      // Enrich with event data from already-loaded events state
      const enriched = records.map((r: any) => ({
        ...r,
        eventTitle:
          events.find((e: any) => e.id === r.eventId)?.title ||
          r.eventTitle ||
          'Unknown Event',
        eventDate:
          events.find((e: any) => e.id === r.eventId)?.date ||
          r.eventDate ||
          '',
        eventType:
          events.find((e: any) => e.id === r.eventId)?.type ||
          r.eventType ||
          '',
      }));

      // Sort by date descending (most recent first)
      enriched.sort((a: any, b: any) =>
        b.eventDate > a.eventDate ? 1 : b.eventDate < a.eventDate ? -1 : 0
      );

      setMemberHistoryRecords(enriched);
    } catch (err) {
      console.error('fetchMemberHistory error:', err);
      addToast('Failed to load member attendance history', 'error');
    } finally {
      setMemberHistoryLoading(false);
    }
  };

  // Auto-switch to member history view when memberId URL param is present
  useEffect(() => {
    if (!targetMemberId || loading) return;
    
    // Find or set a placeholder for the member
    const found = activeMembers.find((m: any) => m.id === targetMemberId);
    if (found) {
      setTargetMember(found);
    } else {
      // Member might be inactive; try a direct lookup
      supabase
        .from('users')
        .select('*')
        .eq('id', targetMemberId)
        .eq('tenant_id', tenant.id)
        .single()
        .then(({ data }) => {
          if (data) setTargetMember(data);
        });
    }
    
    setMode('member');
    fetchMemberHistory(targetMemberId);
  }, [targetMemberId, loading, activeMembers.length]);

  const handleSaveAttendance = async () => {
    if (!selectedEventId) return;
    setIsSaving(true);
    try {
      const batch: any[] = [];
      const eventDetails = events.find(e => e.id === selectedEventId);
      Object.entries(attendanceSheet).forEach(([userId, status]) => {
        if (!status) return;
        const recordId = `${selectedEventId}_${userId}`;
        batch.push(supabase.from('attendance').upsert({
          id: recordId,
          tenant_id: tenant.id,
          userId,
          eventId: selectedEventId,
          eventTitle: eventDetails?.title || 'Unknown Event',
          eventDate: eventDetails?.date || '',
          eventType: eventDetails?.type || '',
          status,
          markedAt: new Date().toISOString(),
          markedBy: user?.id
        }, { onConflict: 'id, tenant_id' }));
      });
      await Promise.all(batch);
      addToast('Attendance saved', 'success');
      
      // Update local state instantly so everything is in sync across tabs!
      const updatedRecs = await loadEventAttendance(selectedEventId, true);
      setHistoryRecords(updatedRecs);
    } catch (err) {
      console.error(err);
      addToast('Failed to save attendance', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const setAll = (status: string|null) => {
    const newSheet: Record<string, string> = {};
    if (status) {
      activeMembers.forEach(m => newSheet[m.id] = status);
    }
    setAttendanceSheet(newSheet);
  };

  const exportCurrentEvent = () => {
    if (!selectedEventId) return;
    const ev = events.find(e => e.id === selectedEventId);
    let csv = 'Member Name,School,Status\n';
    activeMembers.forEach(m => {
       const status = attendanceSheet[m.id] || 'Not Marked';
       csv += `"${m.name || ''}","${m.school || ''}",${status}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Attendance_${ev?.title?.replace(/\s+/g, '_')}.csv`;
    a.click();
  };

  const handleQuickAddEvent = async () => {
    if (!quickEventTitle || !quickEventDate) return;
    try {
      const pDoc = { table: 'events', id: crypto.randomUUID() };
      await supabase.from(pDoc.table).upsert({ id: pDoc.id, tenant_id: tenant.id, ...{
        title: quickEventTitle,
        date: quickEventDate,
        type: 'Meeting',
        isPublic: false,
        createdAt: new Date().toISOString()
      } }, { onConflict: 'id' });
      addToast('Event created quickly', 'success');
      
      await loadBaseData();
      setSelectedEventId(pDoc.id);
      setIsQuickAddOpen(false);
      setQuickEventTitle('');
      setQuickEventDate('');
    } catch(err) { addToast('Failed', 'error'); }
  };

  const exportSummary = async () => {
    try {
       const { data: snap } = await supabase.from('attendance').select('*').eq('tenant_id', tenant.id);
       const allRecs = snap || [];
       
       const userTotals: Record<string, { present: number, late: number, absent: number, excused: number }> = {};
       
       // Calculate the exact set of events that actually have attendance records
       const markedEventsSet = new Set<string>();
       allRecs.forEach(r => {
         markedEventsSet.add(r.eventId);
       });
       const totalMarkedEvents = markedEventsSet.size;

       allRecs.forEach(r => {
         if (!userTotals[r.userId]) {
           userTotals[r.userId] = { present: 0, late: 0, absent: 0, excused: 0 };
         }
         const stats = userTotals[r.userId];
         if (r.status === 'P') stats.present++;
         else if (r.status === 'L') stats.late++;
         else if (r.status === 'A') stats.absent++;
         else if (r.status === 'E') stats.excused++;
       });

       let csv = 'Member Name,Role,School,Present,Late,Absent,Excused,Total Marked Events,Attendance Rate %\n';
       activeMembers.forEach(m => {
          const u = userTotals[m.id] || { present: 0, late: 0, absent: 0, excused: 0 };
          const attended = u.present + u.late;
          const rate = totalMarkedEvents > 0 ? Math.round((attended / totalMarkedEvents) * 100) : 0;
          csv += `"${m.name || ''}","${m.role || ''}","${m.school || ''}",${u.present},${u.late},${u.absent},${u.excused},${totalMarkedEvents},${rate}%\n`;
       });
       
       const blob = new Blob([csv], { type: 'text/csv' });
       const a = document.createElement('a');
       a.href = URL.createObjectURL(blob);
       a.download = `Attendance_Summary_${new Date().toISOString().split('T')[0]}.csv`;
       a.click();
    } catch(err) {
      addToast('Export failed', 'error');
    }
  };

  const getStatusColor = (s: string) => {
    if (s==='P') return 'bg-green-500 text-white border-green-600';
    if (s==='A') return 'bg-red-500 text-white border-red-600';
    if (s==='E') return 'bg-amber-500 text-white border-amber-600';
    if (s==='L') return 'bg-blue-500 text-white border-blue-600';
    return 'bg-gray-100 text-gray-400 border-gray-200';
  };

  return (
    <div className="space-y-8 pb-32">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-heading font-bold text-gray-900">Attendance</h1>
            <span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full font-bold border border-gray-200 uppercase tracking-wider">
              {tenant.id}
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1">Track member participation</p>
        </div>
      </div>

      <div className="flex gap-0 border-b border-gray-200">
        {[
          { id: 'mark', label: 'Mark Attendance' },
          { id: 'history', label: 'Event History' },
          ...(targetMemberId
            ? [{
                id: 'member',
                label: targetMember?.name
                  ? `${targetMember.name}'s History`
                  : 'Member History',
              }]
            : []),
        ].map(t => (
          <button
            key={t.id}
            onClick={() => {
              setMode(t.id as any);
              if (t.id === 'member' && targetMemberId) {
                fetchMemberHistory(targetMemberId);
              }
            }}
            className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
              mode === t.id
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {mode === 'mark' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
             <div className="w-full sm:max-w-md">
                <label className="block text-sm font-bold text-gray-700 mb-2">Select Event</label>
                <select value={selectedEventId} onChange={e => setSelectedEventId(e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-accent bg-gray-50">
                   <option value="">-- Choose an event --</option>
                   {events.map(e => <option key={e.id} value={e.id}>{e.date} — {e.title} ({e.type})</option>)}
                </select>
             </div>
             <button onClick={() => setIsQuickAddOpen(true)} className="text-primary font-medium text-sm flex items-center gap-1 hover:underline whitespace-nowrap mt-4 sm:mt-0 pt-6">
                <CalendarPlus size={16} /> Quick Add Event
             </button>
          </div>

          {selectedEventId && (
            <div className="pt-6 border-t border-gray-100 space-y-4">
               <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50 p-4 rounded-lg">
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => setAll('P')}>Mark All Present</Button>
                    <Button variant="outline" size="sm" onClick={() => setAll('A')}>Mark All Absent</Button>
                    <Button variant="outline" size="sm" onClick={() => setAll(null)}>Clear All</Button>
                  </div>
                  <div className="text-sm font-bold text-gray-500">
                    <span className="text-primary">{Object.values(attendanceSheet).filter(Boolean).length}</span> / {activeMembers.length} marked
                  </div>
               </div>

               <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                 {activeMembers.map(m => {
                   const s = attendanceSheet[m.id];
                   return (
                     <div key={m.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:border-accent/30 transition-colors">
                       <div className="flex items-center gap-3 w-1/2">
                          {m.avatar ? <img src={m.avatar} className="w-8 h-8 rounded-full" /> : <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">{m.name?.substring(0,2)}</div>}
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 truncate">{m.name}</p>
                            <p className="text-[10px] text-gray-500 truncate">{m.school}</p>
                          </div>
                       </div>
                       <div className="flex gap-1 bg-gray-100 p-1 rounded-lg shrink-0">
                         {['P','A','E','L'].map(st => (
                           <button 
                             key={st}
                             onClick={() => setAttendanceSheet({...attendanceSheet, [m.id]: st})}
                             className={`w-8 h-8 rounded-md font-bold text-sm border flex items-center justify-center transition-colors ${s === st ? getStatusColor(st) : 'bg-transparent text-gray-500 border-transparent hover:bg-gray-200'}`}
                             title={st==='P'?'Present':st==='A'?'Absent':st==='E'?'Excused':'Late'}
                           >
                             {st}
                           </button>
                         ))}
                       </div>
                     </div>
                   );
                 })}
               </div>

               <div className="pt-6 border-t border-gray-100 flex justify-between items-center sticky bottom-0 bg-white p-4 -mx-6 -mb-6 border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] rounded-b-xl z-10">
                  <Button variant="outline" onClick={exportCurrentEvent}><Download size={16} className="mr-2"/> Export CSV</Button>
                  <Button onClick={handleSaveAttendance} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Attendance'}</Button>
               </div>
            </div>
          )}
        </div>
      )}

      {mode === 'history' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col max-h-[600px]">
             <div className="p-4 border-b border-gray-100 bg-gray-50 font-bold text-gray-700 flex justify-between items-center">
               Past Events
               <button onClick={exportSummary} className="text-primary hover:underline text-xs flex items-center gap-1"><Download size={12}/> Summary</button>
             </div>
             <div className="overflow-y-auto flex-1 p-2 space-y-1">
               {events.map(e => (
                 <button 
                   key={e.id}
                   onClick={() => setHistoryEventId(e.id)}
                   className={`w-full text-left p-3 rounded-lg border transition-colors ${historyEventId === e.id ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-gray-50'}`}
                 >
                   <div className="font-bold text-gray-900 truncate">{e.title}</div>
                   <div className="text-xs text-gray-500 mt-1">{e.date} • {e.type}</div>
                 </button>
               ))}
             </div>
          </div>
          
          <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6 min-h-[400px]">
             {!historyEventId ? (
               <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <CalendarDays size={48} className="mb-4 text-gray-300" />
                  <p>Select an event to view attendance.</p>
               </div>
             ) : (
               <div className="space-y-6">
                 {/* Summary stats */}
                 <div className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                   {['P','A','E','L'].map(s => (
                     <div key={s} className="flex items-center gap-2">
                       <span className={`w-3 h-3 rounded-full ${getStatusColor(s).split(' ')[0]}`}></span>
                       <span className="font-bold text-gray-700">{historyRecords.filter(r => r.status === s).length}</span>
                     </div>
                   ))}
                   <div className="ml-auto text-sm text-gray-500">Unmarked: {activeMembers.length - historyRecords.length}</div>
                 </div>

                 <div className="max-h-[450px] overflow-y-auto pr-2 divide-y divide-gray-100">
                   {historyRecords.map((r, i) => {
                     const m = activeMembers.find(x => x.id === r.userId);
                     return (
                       <div key={i} className="py-3 flex justify-between items-center">
                         <div>
                           <p className="font-bold text-sm text-gray-900">{m?.name || 'Unknown'}</p>
                           <p className="text-xs text-gray-400">{m?.school || '...'}</p>
                         </div>
                         <div className={`px-3 py-1 rounded text-xs font-bold ${getStatusColor(r.status).replace('border-', '')}`}>
                           {r.status === 'P' ? 'Present' : r.status==='A'?'Absent':r.status==='E'?'Excused':'Late'}
                         </div>
                       </div>
                     )
                   })}
                   {historyRecords.length === 0 && <p className="text-center text-gray-400 py-8">No records for this event.</p>}
                 </div>
               </div>
             )}
          </div>
        </div>
      )}

      {mode === 'member' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          {/* Member Header */}
          <div className="p-6 border-b border-gray-100 flex items-center gap-4">
            {targetMember?.photo ? (
              <img
                src={targetMember.photo}
                alt={targetMember?.name}
                className="w-14 h-14 rounded-full object-cover border-2 border-gray-200 shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                {targetMember?.name?.substring(0, 2)?.toUpperCase() || '??'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-gray-900 truncate">
                {targetMember?.name || 'Loading member...'}
              </h2>
              <p className="text-sm text-gray-500 truncate">{targetMember?.email || ''}</p>
              {(targetMember?.school || targetMember?.grade) && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {targetMember.school}{targetMember.grade ? ` · Grade ${targetMember.grade}` : ''}
                </p>
              )}
            </div>
            <a
              href="/admin/members"
              className="text-sm text-primary hover:text-primary/80 font-medium whitespace-nowrap flex items-center gap-1 shrink-0"
            >
              ← Members
            </a>
          </div>

          <div className="p-6">
            {memberHistoryLoading ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-3" />
                <p className="text-sm">Loading attendance history...</p>
              </div>
            ) : (
              <>
                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {[
                    {
                      label: 'Total Events',
                      value: memberHistoryRecords.length,
                      color: 'text-gray-800',
                      bg: 'bg-gray-50',
                    },
                    {
                      label: 'Present',
                      value: memberHistoryRecords.filter((r: any) => r.status === 'P' || r.status === 'L').length,
                      color: 'text-green-600',
                      bg: 'bg-green-50',
                    },
                    {
                      label: 'Absent',
                      value: memberHistoryRecords.filter((r: any) => r.status === 'A').length,
                      color: 'text-red-500',
                      bg: 'bg-red-50',
                    },
                    {
                      label: 'Attendance Rate',
                      value: memberHistoryRecords.length > 0
                        ? `${Math.round(
                            (memberHistoryRecords.filter((r: any) => r.status === 'P' || r.status === 'L').length /
                              memberHistoryRecords.length) *
                              100
                          )}%`
                        : 'N/A',
                      color: 'text-blue-600',
                      bg: 'bg-blue-50',
                    },
                  ].map(stat => (
                    <div key={stat.label} className={`${stat.bg} rounded-xl p-4 text-center border border-gray-100`}>
                      <p className={`text-3xl font-bold font-heading ${stat.color}`}>{stat.value}</p>
                      <p className="text-xs text-gray-400 uppercase tracking-wide mt-1">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Export + Records */}
                {memberHistoryRecords.length > 0 && (
                  <div className="flex justify-end mb-4">
                    <Button
                      variant="outline-dark"
                      size="sm"
                      onClick={() => {
                        let csv = 'Event Title,Date,Type,Status\n';
                        memberHistoryRecords.forEach((r: any) => {
                          const statusLabel =
                            r.status === 'P' ? 'Present' :
                            r.status === 'A' ? 'Absent' :
                            r.status === 'E' ? 'Excused' : 'Late';
                          csv += `"${r.eventTitle || ''}","${r.eventDate || ''}","${r.eventType || ''}","${statusLabel}"\n`;
                        });
                        const blob = new Blob([csv], { type: 'text/csv' });
                        const a = document.createElement('a');
                        a.href = URL.createObjectURL(blob);
                        a.download = `Attendance_${(targetMember?.name || 'member').replace(/\s+/g, '_')}.csv`;
                        a.click();
                      }}
                    >
                      <Download size={14} className="mr-1.5" /> Export CSV
                    </Button>
                  </div>
                )}

                {/* Records List */}
                {memberHistoryRecords.length === 0 ? (
                  <div className="text-center py-14 text-gray-400">
                    <CalendarDays size={44} className="mx-auto mb-3 opacity-25" />
                    <p className="font-medium">No attendance records found for this member.</p>
                    <p className="text-sm mt-1 text-gray-400">Records appear here after an admin marks attendance for an event.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50 max-h-[520px] overflow-y-auto">
                    {memberHistoryRecords.map((r: any, i: number) => (
                      <div key={i} className="py-3.5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-gray-900 truncate">{r.eventTitle}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {r.eventDate
                              ? new Date(r.eventDate + 'T00:00:00').toLocaleDateString('en-US', {
                                  weekday: 'short',
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : 'Date not recorded'}
                            {r.eventType ? ` · ${r.eventType}` : ''}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold uppercase border shrink-0 ${getStatusColor(r.status)}`}
                        >
                          {r.status === 'P'
                            ? 'Present'
                            : r.status === 'A'
                            ? 'Absent'
                            : r.status === 'E'
                            ? 'Excused'
                            : 'Late'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Quick Add Event Modal */}
      <Modal isOpen={isQuickAddOpen} onClose={() => setIsQuickAddOpen(false)} title="Quick Add Event" size="sm">
         <div className="space-y-4 mb-6">
            <div><label className="block text-sm font-medium mb-1">Title</label><input value={quickEventTitle} onChange={e=>setQuickEventTitle(e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="e.g. Weekly Meeting" /></div>
            <div><label className="block text-sm font-medium mb-1">Date</label><input type="date" value={quickEventDate} onChange={e=>setQuickEventDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></div>
         </div>
         <Button onClick={handleQuickAddEvent} className="w-full">Create Event</Button>
      </Modal>

    </div>
  );
}
