import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useDues, FeeTemplate, LedgerEntry, DuesStats } from '../../hooks/useDues';
import { exportSelectedMembers, exportMemberDues, exportDuesSummaryFile } from '../../utils/duesExport';
import { useToast } from '../../hooks/useToast';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { DuesSummaryCards } from '../../components/dues/DuesSummaryCards';
import { LedgerTable } from '../../components/dues/LedgerTable';
import { FeeTemplateForm } from '../../components/dues/FeeTemplateForm';
import { BulkMarkPaidModal } from '../../components/dues/BulkMarkPaidModal';
import { useAdminTenant } from '../../hooks/useAdminTenant';

export default function AdminDues() {
  const { adminTenant: tenant } = useAdminTenant();
  const { user } = useAuth();
  const { addToast } = useToast();
  const {
    loading,
    markOverdueFees,
    fetchDuesStats,
    fetchTemplates,
    fetchLedger,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    generateMonthlyFees,
    bulkSendReminders,
    bulkMarkPaid,
    markAsWaived,
    sendReminder,
  } = useDues();

  const [stats, setStats] = useState<DuesStats | null>(null);
  const [templates, setTemplates] = useState<FeeTemplate[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isTemplateFormOpen, setIsTemplateFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<FeeTemplate | null>(null);
  
  const [activeTab, setActiveTab] = useState('overview');
  const [showBulkMarkPaid, setShowBulkMarkPaid] = useState(false);
  const [showConfirmGen, setShowConfirmGen] = useState(false);
  const [genMonth, setGenMonth] = useState<number>(new Date().getMonth() + 1);
  const [genYear, setGenYear] = useState<number>(new Date().getFullYear());
  const [genTemplateId, setGenTemplateId] = useState<string>('all');
  const [genAmount, setGenAmount] = useState<string>('');

  // Per Member Tab State
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState('');

  useEffect(() => {
    // silently mark overdue fees
    markOverdueFees().catch(console.error);
    loadAllData();
  }, [markOverdueFees, tenant.id]);

  const loadAllData = async () => {
    const [s, t, l] = await Promise.all([
      fetchDuesStats(),
      fetchTemplates(),
      fetchLedger()
    ]);
    if (s) setStats(s);
    setTemplates(t);
    setLedger(l);
  };

  const selectedEntries = ledger.filter(l => selectedIds.includes(l.id));

  const handleExportSelected = async () => {
    if (!selectedEntries.length) return;
    const membersMap = new Map();
    selectedEntries.forEach(e => {
        if (e.users) membersMap.set(e.member_id, e.users);
    });
    await exportSelectedMembers(Array.from(membersMap.values()), selectedEntries);
  };

  // Group ledger by member for the Per Member tab
  const membersWithLedgers = React.useMemo(() => {
    const map = new Map<string, { user: any, entries: LedgerEntry[], outstanding: number }>();
    ledger.forEach(entry => {
      if (!entry.users) return;
      if (entry.users.tenant_id !== tenant.id) return; // Strict tenant isolation filter
      if (!map.has(entry.member_id)) {
        map.set(entry.member_id, { user: entry.users, entries: [], outstanding: 0 });
      }
      const data = map.get(entry.member_id)!;
      data.entries.push(entry);
      if (entry.status !== 'waived' && entry.status !== 'paid') {
        data.outstanding += (entry.amount - (entry.paid_amount || 0));
      }
    });
    return Array.from(map.values()).filter(m => 
      m.user.name.toLowerCase().includes(memberSearch.toLowerCase())
    );
  }, [ledger, memberSearch, tenant.id]);

  const selectedMemberData = membersWithLedgers.find(m => m.user.id === selectedMemberId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Dues & Fees Management</h1>
          <span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full font-bold border border-gray-200 uppercase tracking-wider">
            {tenant.id}
          </span>
        </div>
        <Button onClick={() => handleExportSelected()} disabled={selectedIds.length === 0} variant="outline">
          Export Selected ({selectedIds.length})
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="templates">Fee Templates</TabsTrigger>
          <TabsTrigger value="ledger">Ledger</TabsTrigger>
          <TabsTrigger value="member">Per Member</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <DuesSummaryCards stats={stats} loading={loading} />
          <div className="mt-6 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Quick Actions</h2>
          </div>
          <div className="flex flex-wrap gap-4 mt-4">
             <Button onClick={() => setShowConfirmGen(true)}>Generate This Month's Fees</Button>
             <Button variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-slate-50 font-bold" onClick={async () => {
                if (stats) {
                  await exportDuesSummaryFile(ledger, stats);
                  addToast('Summary file downloaded successfully', 'success');
                } else {
                  addToast('Payment stats are loading', 'error');
                }
             }}>Download Dues Summary Report</Button>
             <Button variant="outline" onClick={async () => {
                if (window.confirm('Send reminders to all members with overdue fees?')) {
                  const overdue = ledger.filter(l => l.status === 'overdue' || l.status === 'unpaid').map(l => l.id);
                  if (overdue.length > 0) {
                     await bulkSendReminders(overdue);
                     loadAllData();
                  } else {
                     addToast('No overdue fees found', 'info');
                  }
                }
             }}>Send All Overdue Reminders</Button>
             <Button variant="outline" onClick={async () => {
                const membersMap = new Map();
                ledger.forEach(e => { if (e.users) membersMap.set(e.member_id, e.users); });
                await exportSelectedMembers(Array.from(membersMap.values()), ledger);
             }}>Export All Data</Button>
          </div>
        </TabsContent>

        <TabsContent value="templates">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">Fee Templates</h2>
            <Button onClick={() => { setEditingTemplate(null); setIsTemplateFormOpen(true); }}>
              Add Fee Template
            </Button>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
               <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {templates.map(t => (
                  <tr key={t.id}>
                    <td className="px-4 py-3 font-medium">{t.name}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{t.type}</span></td>
                    <td className="px-4 py-3 text-right">{t.amount} {t.currency}</td>
                    <td className="px-4 py-3 text-center">
                      {t.is_active ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">Published</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">Draft</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right flex items-center justify-end gap-2">
                       {!t.is_active && (
                         <Button 
                           size="sm" 
                           variant="outline" 
                           className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 font-bold py-1 px-2.5 text-xs" 
                           onClick={async () => {
                             await updateTemplate(t.id, { is_active: true });
                             loadAllData();
                             addToast('Template published successfully!', 'success');
                           }}
                         >
                           Publish
                         </Button>
                       )}
                       <Button size="sm" variant="ghost" className="font-bold" onClick={() => { setEditingTemplate(t); setIsTemplateFormOpen(true); }}>Edit</Button>
                       <Button size="sm" variant="ghost" className="text-red-500 font-bold" onClick={async () => {
                          if (window.confirm('Are you sure you want to delete this template?')) {
                             await deleteTemplate(t.id);
                             loadAllData();
                          }
                       }}>Delete</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="ledger">
          <div className="mb-4">
            {selectedIds.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
                <span className="text-sm font-medium text-blue-800">{selectedIds.length} items selected</span>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setShowBulkMarkPaid(true)}>Mark as Paid</Button>
                  <Button size="sm" variant="outline" onClick={() => setSelectedIds([])}>Clear Selection</Button>
                </div>
              </div>
            )}
          </div>
          <LedgerTable 
            entries={ledger} 
            loading={loading} 
            selectedIds={selectedIds} 
            onSelectChange={setSelectedIds}
            onMarkPaid={(e) => { setSelectedIds([e.id]); setShowBulkMarkPaid(true); }}
            onMarkWaived={async (e) => {
              if (window.confirm(`Are you sure you want to waive this fee: "${e.label}" for ${e.users?.name || 'Unknown'}?`)) {
                await markAsWaived(e.id);
                loadAllData();
              }
            }}
            onSendReminder={async (e) => {
              await sendReminder(e.id);
              loadAllData();
            }}
          />
        </TabsContent>

        <TabsContent value="member">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left Panel - Member List */}
            <div className="w-full lg:w-1/3 bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col h-[600px]">
               <div className="p-4 border-b border-gray-200 bg-gray-50 shrink-0">
                  <input type="text" placeholder="Search members..." value={memberSearch} onChange={e => setMemberSearch(e.target.value)} className="w-full px-3 py-2 border rounded-md" />
               </div>
               <div className="overflow-y-auto flex-1 divide-y divide-gray-100 p-2">
                  {membersWithLedgers.map(m => (
                    <button key={m.user.id} onClick={() => setSelectedMemberId(m.user.id)} className={`w-full flex items-center gap-3 p-3 text-left rounded-lg transition-colors ${selectedMemberId === m.user.id ? 'bg-primary/10' : 'hover:bg-gray-50'}`}>
                       <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden shrink-0">
                          {m.user.photo ? <img src={m.user.photo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold">{m.user.name.substring(0,2)}</div>}
                       </div>
                       <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">{m.user.name}</div>
                          <div className="text-xs text-gray-500 truncate">{m.user.email}</div>
                       </div>
                       {m.outstanding > 0 && (
                          <div className="shrink-0 bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded-full text-right">
                             {m.outstanding.toLocaleString()} BDT
                          </div>
                       )}
                    </button>
                  ))}
               </div>
            </div>

            {/* Right Panel - Detail */}
            <div className="w-full lg:w-2/3 space-y-4">
               {selectedMemberData ? (() => {
                  const m = selectedMemberData.user;
                  const mEntries = selectedMemberData.entries;
                  
                  let totalCharged = 0;
                  let totalPaid = 0;
                  let totalWaived = 0;
                  mEntries.forEach(e => {
                     if (e.status === 'waived') { totalWaived += e.amount; }
                     else { totalCharged += e.amount; totalPaid += (e.paid_amount || 0); }
                  });
                  const payRate = (totalCharged - totalWaived) > 0 ? ((totalPaid / (totalCharged - totalWaived)) * 100).toFixed(1) : 'N/A';
                  
                  return (
                    <>
                      <div className="bg-white p-6 rounded-lg border border-gray-200 flex flex-col md:flex-row gap-4 justify-between items-start">
                         <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-gray-200 overflow-hidden shrink-0">
                               {m.photo ? <img src={m.photo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold text-xl">{m.name.substring(0,2)}</div>}
                            </div>
                            <div>
                               <h2 className="text-xl font-bold text-gray-900">{m.name}</h2>
                               <p className="text-gray-500 text-sm">{m.email} &bull; {m.role} &bull; Joined {m.joinDate ? new Date(m.joinDate).getFullYear() : 'N/A'}</p>
                            </div>
                         </div>
                         <div className="flex gap-2">
                             <Button size="sm" variant="outline" onClick={async () => {
                                 if (window.confirm(`Export dues history for ${m.name}?`)) {
                                     await exportMemberDues(m, mEntries);
                                 }
                             }}>Export This Member</Button>
                         </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                         <div className="bg-white p-4 rounded-lg border border-gray-200 flex flex-col justify-center">
                            <span className="text-xs text-gray-500 uppercase tracking-wide">Total Charged</span>
                            <span className="text-lg font-bold text-gray-900">{totalCharged.toLocaleString()}</span>
                         </div>
                         <div className="bg-white p-4 rounded-lg border border-gray-200 flex flex-col justify-center">
                            <span className="text-xs text-gray-500 uppercase tracking-wide">Total Paid</span>
                            <span className="text-lg font-bold text-green-600">{totalPaid.toLocaleString()}</span>
                         </div>
                         <div className="bg-white p-4 rounded-lg border border-gray-200 flex flex-col justify-center">
                            <span className="text-xs text-gray-500 uppercase tracking-wide">Outstanding</span>
                            <span className="text-lg font-bold text-red-600">{(totalCharged - totalPaid).toLocaleString()}</span>
                         </div>
                         <div className="bg-white p-4 rounded-lg border border-gray-200 flex flex-col justify-center">
                            <span className="text-xs text-gray-500 uppercase tracking-wide">Payment Rate</span>
                            <span className="text-lg font-bold text-blue-600">{payRate}%</span>
                         </div>
                      </div>

                      <div className="flex gap-2 justify-end mb-2">
                         <Button size="sm" variant="outline" onClick={async () => {
                             const unpaid = mEntries.filter(e => e.status === 'unpaid' || e.status === 'overdue');
                             if (!unpaid.length) return addToast('No unpaid entries', 'info');
                             if (window.confirm(`Mark all ${unpaid.length} unpaid entries as paid for ${m.name}?`)) {
                                 await bulkMarkPaid(unpaid.map(u => u.id));
                                 loadAllData();
                             }
                         }}>Mark All Unpaid as Paid</Button>
                         <Button size="sm" variant="outline" onClick={async () => {
                             const unpaid = mEntries.filter(e => e.status === 'unpaid' || e.status === 'overdue');
                             if (!unpaid.length) return addToast('No unpaid entries', 'info');
                             if (window.confirm(`Send reminders for all ${unpaid.length} unpaid entries?`)) {
                                 await bulkSendReminders(unpaid.map(u => u.id));
                                 loadAllData();
                             }
                         }}>Send Reminder for All Unpaid</Button>
                      </div>

                      <LedgerTable 
                         entries={mEntries}
                         loading={loading}
                         selectedIds={selectedIds}
                         onSelectChange={setSelectedIds}
                         onMarkPaid={(e) => { setSelectedIds([e.id]); setShowBulkMarkPaid(true); }}
                         onMarkWaived={async (e) => {
                           if (window.confirm(`Are you sure you want to waive this fee: "${e.label}" for ${e.users?.name || 'Unknown'}?`)) {
                             await markAsWaived(e.id);
                             loadAllData();
                           }
                         }}
                         onSendReminder={async (e) => {
                           await sendReminder(e.id);
                           loadAllData();
                         }}
                         showMemberColumn={false}
                      />
                    </>
                  );
               })() : (
                  <div className="bg-white p-12 text-center rounded-lg border border-gray-200 h-full flex flex-col items-center justify-center">
                     <span className="text-gray-400 font-medium">Select a member to view their customized dues breakdown.</span>
                  </div>
               )}
            </div>
          </div>
        </TabsContent>
        
      </Tabs>

      <FeeTemplateForm
        isOpen={isTemplateFormOpen}
        onClose={() => setIsTemplateFormOpen(false)}
        onSubmit={async (data) => {
           if (editingTemplate) {
              await updateTemplate(editingTemplate.id, data);
              loadAllData();
              setIsTemplateFormOpen(false);
              return null;
           } else {
              const tmpl = await createTemplate(data);
              loadAllData();
              setIsTemplateFormOpen(false);
              return tmpl;
           }
        }}
        editingTemplate={editingTemplate}
      />

      {showBulkMarkPaid && (
        <BulkMarkPaidModal
          entries={selectedEntries}
          onClose={() => setShowBulkMarkPaid(false)}
          onConfirm={async (amount, notes, date) => {
             await bulkMarkPaid(selectedIds, amount, date, notes);
             setShowBulkMarkPaid(false);
             setSelectedIds([]);
             loadAllData();
          }}
        />
      )}
      
       {showConfirmGen && (
        <Modal isOpen={true} onClose={() => setShowConfirmGen(false)} title="Generate Monthly Fees">
          <div className="space-y-4">
            <p className="text-sm text-gray-500 font-medium">Configure date, template, and custom amount to generate monthly dues entries.</p>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Month</label>
                <select value={genMonth} onChange={e => setGenMonth(Number(e.target.value))} className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-1 focus:ring-indigo-500">
                  {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Year</label>
                <input type="number" min="2000" max="2100" value={genYear} onChange={e => setGenYear(Number(e.target.value))} className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Fee Template</label>
              <select 
                value={genTemplateId} 
                onChange={e => setGenTemplateId(e.target.value)} 
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
              >
                <option value="all">All Active Monthly Templates</option>
                {templates.filter(t => t.type === 'monthly' && t.is_active).map(t => (
                  <option key={t.id} value={t.id}>{t.name} (Default: {t.amount} {t.currency})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Custom Amount (Optional Override)</label>
              <input 
                type="number" 
                min="0"
                step="0.01"
                placeholder="Leave blank to use default template amount" 
                value={genAmount} 
                onChange={e => setGenAmount(e.target.value)} 
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm" 
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowConfirmGen(false)}>Cancel</Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold" onClick={async () => {
                const activeMonthly = templates.filter(t => t.type === 'monthly' && t.is_active);
                let count = 0;
                
                const overrideAmt = genAmount !== '' && !isNaN(Number(genAmount)) ? Number(genAmount) : undefined;

                if (genTemplateId === 'all') {
                  if (activeMonthly.length === 0) {
                    addToast('No active monthly templates found.', 'error');
                    return;
                  }
                  for (const t of activeMonthly) {
                    count += await generateMonthlyFees(t.id, genMonth, genYear, overrideAmt);
                  }
                } else {
                  count += await generateMonthlyFees(genTemplateId, genMonth, genYear, overrideAmt);
                }
                
                addToast(`Generated fees for ${count} entries locally.`, 'success');
                setShowConfirmGen(false);
                setGenAmount('');
                loadAllData();
              }}>Generate Now</Button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}
