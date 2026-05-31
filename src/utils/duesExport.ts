import * as XLSX from 'xlsx';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
  joinDate?: string;
  dob?: string;
  address?: string;
  school?: string;
  grade?: string;
  bloodGroup?: string;
  emergencyPhone?: string;
  emergencyDetails?: string;
  photo?: string;
}

export interface LedgerEntry {
  id: string;
  member_id: string;
  template_id: string;
  label: string;
  amount: number;
  currency: string;
  due_date: string;
  paid_at?: string;
  paid_amount?: number;
  status: 'unpaid' | 'paid' | 'waived' | 'overdue';
  notes?: string;
  reminder_sent_at?: string;
  reminder_count: number;
  created_at: string;
  users?: UserProfile;
  fee_templates?: { name: string; type: string };
}

export async function exportMemberDues(member: UserProfile, entries: LedgerEntry[]): Promise<void> {
  const wb = XLSX.utils.book_new();

  // 1. Profile Sheet
  const profileData = [
    ['Field', 'Value'],
    ['Full Name', member.name],
    ['Email', member.email],
    ['Phone', member.phone || 'N/A'],
    ['Role', member.role],
    ['Status', member.status],
    ['Join Date', member.joinDate || 'N/A'],
    ['DOB', member.dob || 'N/A'],
    ['Address', member.address || 'N/A'],
    ['School', member.school || 'N/A'],
    ['Grade', member.grade || 'N/A'],
    ['Blood Group', member.bloodGroup || 'N/A'],
    ['Emergency Phone', member.emergencyPhone || 'N/A'],
    ['Emergency Details', member.emergencyDetails || 'N/A']
  ];
  const wsProfile = XLSX.utils.aoa_to_sheet(profileData);
  wsProfile['!cols'] = [{ wch: 20 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsProfile, 'Profile');

  // 2. Dues Summary
  let totalCharged = 0;
  let totalPaid = 0;
  let totalWaived = 0;
  let overdueCount = 0;
  let waivedCount = 0;

  entries.forEach(e => {
    if (e.status === 'waived') {
      totalWaived += e.amount;
      waivedCount++;
    } else {
      totalCharged += e.amount;
      totalPaid += (e.paid_amount || 0);
      if (e.status === 'overdue') overdueCount++;
    }
  });

  const outstanding = totalCharged - totalPaid;
  const paymentRate = (totalCharged - totalWaived) > 0 
    ? ((totalPaid / (totalCharged - totalWaived)) * 100).toFixed(1) + '%' 
    : 'N/A';

  const summaryData = [
    ['Label', 'Value'],
    ['Total Charged', totalCharged],
    ['Total Paid', totalPaid],
    ['Outstanding', outstanding],
    ['Payment Rate %', paymentRate],
    ['Overdue Entries count', overdueCount],
    ['Waived Entries count', waivedCount]
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Dues Summary');

  // 3. Dues Detail
  const detailData: any[][] = [
    ['Fee Label', 'Type', 'Amount', 'Currency', 'Due Date', 'Status', 'Paid Date', 'Paid Amount', 'Outstanding', 'Notes', 'Reminders Sent']
  ];
  
  entries.forEach(e => {
    detailData.push([
      e.label,
      e.fee_templates?.type || 'N/A',
      e.amount,
      e.currency,
      e.due_date,
      e.status,
      e.paid_at || '',
      e.paid_amount || 0,
      e.amount - (e.paid_amount || 0),
      e.notes || '',
      e.reminder_count
    ]);
  });
  
  detailData.push([]);
  detailData.push([
     'TOTALS', '', totalCharged, '', '', '', '', totalPaid, outstanding, '', ''
  ]);
  
  const wsDetail = XLSX.utils.aoa_to_sheet(detailData);
  const wscols = detailData[0].map((_, i) => ({ wch: Math.max(...detailData.map(row => row[i] ? row[i].toString().length : 0)) + 2 }));
  wsDetail['!cols'] = wscols;

  XLSX.utils.book_append_sheet(wb, wsDetail, 'Dues Detail');

  const fileName = `${member.name.replace(/\s+/g, '-')}-dues-${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export async function exportSelectedMembers(members: UserProfile[], allEntries: LedgerEntry[]): Promise<void> {
  const wb = XLSX.utils.book_new();

  // 1. Summary Sheet
  const summaryData: any[][] = [
    ['Name', 'Email', 'Role', 'Status', 'Join Date', 'Total Charged', 'Total Paid', 'Outstanding', 'Payment Rate %']
  ];
  
  let grandTotalCharged = 0;
  let grandTotalPaid = 0;
  let grandOutstanding = 0;

  members.forEach(m => {
    const memberEntries = allEntries.filter(e => e.member_id === m.id);
    
    let totalCharged = 0;
    let totalPaid = 0;
    let totalWaived = 0;
    
    memberEntries.forEach(e => {
        if (e.status === 'waived') {
           totalWaived += e.amount;
        } else {
           totalCharged += e.amount;
           totalPaid += (e.paid_amount || 0);
        }
    });
    
    const outstanding = totalCharged - totalPaid;
    const paymentRate = (totalCharged - totalWaived) > 0 
      ? ((totalPaid / (totalCharged - totalWaived)) * 100).toFixed(1) + '%' 
      : 'N/A';
    
    grandTotalCharged += totalCharged;
    grandTotalPaid += totalPaid;
    grandOutstanding += outstanding;
    
    summaryData.push([
      m.name,
      m.email,
      m.role,
      m.status,
      m.joinDate || '',
      totalCharged,
      totalPaid,
      outstanding,
      paymentRate
    ]);
  });
  
  summaryData.push([]);
  summaryData.push(['GRAND TOTAL', '', '', '', '', grandTotalCharged, grandTotalPaid, grandOutstanding, '']);

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = summaryData[0].map((_, i) => ({ wch: Math.max(...summaryData.map(row => row[i] ? row[i].toString().length : 0)) + 2 }));
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  // 2. All Dues Detail
  const detailData: any[][] = [
    ['Member Name', 'Fee Label', 'Type', 'Amount', 'Currency', 'Due Date', 'Status', 'Paid Date', 'Paid Amount', 'Outstanding', 'Notes']
  ];
  
  members.forEach(m => {
     const memberEntries = allEntries.filter(e => e.member_id === m.id);
     memberEntries.forEach(e => {
         detailData.push([
             m.name,
             e.label,
             e.fee_templates?.type || 'N/A',
             e.amount,
             e.currency,
             e.due_date,
             e.status,
             e.paid_at || '',
             e.paid_amount || 0,
             e.amount - (e.paid_amount || 0),
             e.notes || ''
         ]);
     });
     if (memberEntries.length > 0) detailData.push([]);
  });
  
  const wsDetail = XLSX.utils.aoa_to_sheet(detailData);
  wsDetail['!cols'] = detailData[0].map((_, i) => ({ wch: 15 }));
  XLSX.utils.book_append_sheet(wb, wsDetail, 'All Dues Detail');

  // 3. Overdue & Unpaid
  const overdueData: any[][] = [
    ['Member Name', 'Fee Label', 'Type', 'Amount', 'Currency', 'Due Date', 'Status', 'Paid Date', 'Paid Amount', 'Outstanding', 'Notes']
  ];
  const overdueEntries = allEntries.filter(e => e.status === 'overdue' || e.status === 'unpaid');
  
  if (overdueEntries.length === 0) {
    overdueData.push(['No overdue or unpaid fees found']);
  } else {
    members.forEach(m => {
        const memberEntries = overdueEntries.filter(e => e.member_id === m.id);
        memberEntries.forEach(e => {
            overdueData.push([
                m.name,
                e.label,
                e.fee_templates?.type || 'N/A',
                e.amount,
                e.currency,
                e.due_date,
                e.status,
                e.paid_at || '',
                e.paid_amount || 0,
                e.amount - (e.paid_amount || 0),
                e.notes || ''
            ]);
        });
    });
  }
  const wsOverdue = XLSX.utils.aoa_to_sheet(overdueData);
  wsOverdue['!cols'] = overdueData[0].map((_, i) => ({ wch: 15 }));
  XLSX.utils.book_append_sheet(wb, wsOverdue, 'Overdue & Unpaid');

  const fileName = `members-dues-${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
