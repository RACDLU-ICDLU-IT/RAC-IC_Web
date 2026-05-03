import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { CheckCircle2, Clock, XCircle, CalendarDays, BarChart, FileQuestion, MinusCircle } from 'lucide-react';

export default function DashboardAttendance() {
  const { user } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        // Fetch this member's attendance records (no orderBy to avoid index requirement)
        const attSnap = await getDocs(
          query(collection(db, 'attendance'), where('userId', '==', user.uid))
        );
        const attRecords = attSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));

        // Fetch all events to join names and dates
        const eventsSnap = await getDocs(collection(db, 'events'));
        const eventsMap: Record<string, any> = {};
        eventsSnap.docs.forEach(d => { eventsMap[d.id] = d.data(); });

        // Enrich records with event data
        const enriched = attRecords.map((r: any) => ({
          ...r,
          eventTitle: eventsMap[r.eventId]?.title || 'Club Meeting',
          eventDate: eventsMap[r.eventId]?.date || '',
          eventType: eventsMap[r.eventId]?.type || '',
        }));

        // Sort by date descending (most recent first)
        enriched.sort((a, b) => (b.eventDate > a.eventDate ? 1 : -1));
        setRecords(enriched);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading) {
    return <div className="p-12 flex justify-center"><div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" /></div>;
  }

  const present = records.filter(r => r.status === 'present' || r.status === 'late').length;
  const absent = records.filter(r => r.status === 'absent').length;
  const excused = records.filter(r => r.status === 'excused').length;
  const late = records.filter(r => r.status === 'late').length;
  const total = records.length;
  const rate = total > 0 ? Math.round((present / total) * 100) : 0;
  const rateColor = rate >= 75 ? 'text-green-600' : rate >= 50 ? 'text-amber-500' : 'text-red-500';

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <CheckCircle2 className="text-green-500" size={22} />;
      case 'absent': return <XCircle className="text-red-500" size={22} />;
      case 'excused': return <Clock className="text-amber-500" size={22} />;
      case 'late': return <MinusCircle className="text-blue-500" size={22} />;
      default: return <FileQuestion className="text-gray-400" size={22} />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-700 border-green-200';
      case 'absent': return 'bg-red-100 text-red-700 border-red-200';
      case 'excused': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'late': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-500 border-gray-200';
    }
  };

  return (
    <div className="animate-fade-in-up max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-bold text-gray-900">Attendance Tracker</h1>
        <p className="text-gray-500 mt-1 text-sm">Your participation record for all club meetings and events.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 text-center">
          <p className={`text-4xl font-heading font-bold ${rateColor}`}>{rate}%</p>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Attendance Rate</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 text-center">
          <p className="text-4xl font-heading font-bold text-green-600">{present}</p>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Present</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 text-center">
          <p className="text-4xl font-heading font-bold text-red-500">{absent}</p>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Absent</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 text-center">
          <p className="text-4xl font-heading font-bold text-amber-500">{excused}</p>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Excused / Late</p>
        </div>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
          <div className="flex justify-between text-sm font-bold text-gray-500 mb-2">
            <span>Attendance Progress</span>
            <span>{present}/{total} events</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${rate >= 75 ? 'bg-green-500' : rate >= 50 ? 'bg-amber-400' : 'bg-red-500'}`}
              style={{ width: `${rate}%` }}
            />
          </div>
        </div>
      )}

      {/* History */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center gap-2">
          <CalendarDays className="text-primary" size={20} />
          <h3 className="font-heading font-bold text-lg">Attendance History</h3>
          <span className="ml-auto text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{total} records</span>
        </div>

        {records.length === 0 ? (
          <div className="p-16 text-center text-gray-400">
            <CalendarDays size={48} className="mx-auto mb-4 opacity-30" />
            <p className="font-medium">No attendance records yet.</p>
            <p className="text-sm mt-1">Records appear here after an officer marks attendance.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {records.map(record => (
              <div key={record.id} className="p-4 md:p-5 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 flex items-center justify-center shrink-0">
                    {getStatusIcon(record.status)}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 leading-tight">{record.eventTitle}</h4>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {record.eventDate
                        ? new Date(record.eventDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })
                        : 'Date not recorded'
                      }
                      {record.eventType && ` • ${record.eventType}`}
                    </p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border shrink-0 ${getStatusBadge(record.status)}`}>
                  {record.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
