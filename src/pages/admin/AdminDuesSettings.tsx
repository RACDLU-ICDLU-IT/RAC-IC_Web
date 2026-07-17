import React, { useEffect, useState } from 'react';
import { useAdminTenant } from '../../hooks/useAdminTenant';
import { useDues, DuesSettings } from '../../hooks/useDues';
import { useToast } from '../../hooks/useToast';
import { Button } from '../../components/ui/Button';

export default function AdminDuesSettings() {
  const { adminTenant: tenant } = useAdminTenant();
  const { addToast } = useToast();
  const { loading, fetchDuesSettings, updateDuesSettings } = useDues();

  const [clubPrefix, setClubPrefix] = useState('');
  const [defaultBkash, setDefaultBkash] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDuesSettings().then((s: DuesSettings) => {
      setClubPrefix(s.club_prefix || '');
      setDefaultBkash(s.default_bkash_number || '');
      setInitialized(true);
      setDirty(false);
    });
  }, [tenant.id]);

  const handleSave = async () => {
    if (!clubPrefix.trim()) {
      addToast('Club prefix is required (used for receipt numbers)', 'error');
      return;
    }
    setSaving(true);
    const ok = await updateDuesSettings({
      club_prefix: clubPrefix.trim().toUpperCase(),
      default_bkash_number: defaultBkash.trim() || null,
    });
    setSaving(false);
    if (ok) setDirty(false);
  };

  if (!initialized) {
    return <div className="max-w-2xl mx-auto py-12 text-center text-gray-400">Loading…</div>;
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Dues Payment Settings</h1>
        <span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full font-bold border border-gray-200 uppercase">{tenant.id}</span>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Club Prefix</label>
          <input
            value={clubPrefix}
            onChange={(e) => { setClubPrefix(e.target.value.toUpperCase()); setDirty(true); }}
            placeholder="e.g. RACDLU"
            maxLength={20}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 font-mono uppercase"
          />
          <p className="text-xs text-gray-400 mt-1.5">
            Used to generate receipt numbers on verified payments, formatted as{' '}
            <span className="font-mono">{clubPrefix || 'PREFIX'}/RCPT/2025-26/001</span>.
          </p>
        </div>

        <div className="pt-6 border-t border-gray-100">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Default bKash Number</label>
          <input
            value={defaultBkash}
            onChange={(e) => { setDefaultBkash(e.target.value); setDirty(true); }}
            placeholder="01XXXXXXXXX"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 font-mono"
          />
          <p className="text-xs text-gray-400 mt-1.5">
            Shown to members as the "Send Money" number when paying a due, unless a specific fee
            template overrides it with its own bKash number.
          </p>
        </div>

        <div className="pt-6 border-t border-gray-100 flex justify-end">
          <Button onClick={handleSave} disabled={!dirty || saving || loading}>
            {saving ? 'Saving…' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
}
