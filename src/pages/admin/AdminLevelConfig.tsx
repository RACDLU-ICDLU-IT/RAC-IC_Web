import React, { useEffect, useState } from 'react';
import { usePoints, LevelConfig } from '../../hooks/usePoints';
import { useAdminTenant } from '../../hooks/useAdminTenant';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Trophy, Plus, Trash2, Save, Loader2, Info, Zap } from 'lucide-react';

const DEFAULT_LABELS = [
  'Starter', 'Member', 'Active', 'Contributor', 'Senior',
  'Leader', 'Champion', 'Foundation Builder', 'Rotary Fellow', 'PHF Candidate'
];

export default function AdminLevelConfig() {
  const { adminTenant: tenant } = useAdminTenant();
  const { fetchLevelConfigs, saveLevelConfig, loading } = usePoints();
  const [configs, setConfigs] = useState<Array<{ level: number; xp_required: number; label: string }>>([]);
  const [dirty, setDirty] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    fetchLevelConfigs().then(data => {
      if (data.length === 0) {
        // Default 10 levels
        setConfigs(generateDefaults(10));
      } else {
        setConfigs(data.map(d => ({ level: d.level, xp_required: d.xp_required, label: d.label || '' })));
      }
    });
  }, [tenant.id]);

  function generateDefaults(count: number) {
    const out = [];
    let xp = 500;
    for (let i = 1; i <= count; i++) {
      out.push({ level: i, xp_required: xp, label: DEFAULT_LABELS[i - 1] || `Level ${i}` });
      xp += i <= 5 ? 1000 : 1500;
    }
    return out;
  }

  const updateRow = (idx: number, field: string, val: any) => {
    setConfigs(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r));
    setDirty(true);
  };

  const addLevel = () => {
    if (configs.length >= 100) return;
    const lastXP = configs[configs.length - 1]?.xp_required || 0;
    const lastLevel = configs[configs.length - 1]?.level || 0;
    setConfigs(prev => [...prev, { level: lastLevel + 1, xp_required: lastXP + 1000, label: '' }]);
    setDirty(true);
  };

  const removeLevel = (idx: number) => {
    setConfigs(prev => {
      const next = prev.filter((_, i) => i !== idx);
      // Re-index levels
      return next.map((r, i) => ({ ...r, level: i + 1 }));
    });
    setDirty(true);
  };

  const handleSave = async () => {
    // Sort and re-index before saving
    const sorted = [...configs]
      .sort((a, b) => a.xp_required - b.xp_required)
      .map((r, i) => ({ ...r, level: i + 1 }));
    setConfigs(sorted);
    await saveLevelConfig(sorted.map(c => ({ ...c, tenant_id: tenant.id })));
    setDirty(false);
  };

  const handleReset = () => {
    setConfigs(generateDefaults(10));
    setDirty(true);
    setConfirmReset(false);
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900 flex items-center gap-2">
            <Trophy className="text-accent" size={28} /> Level Configuration
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Define XP thresholds for each level (up to 100 levels).
            Members automatically level up when they reach the required XP.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setConfirmReset(true)}>Reset Defaults</Button>
          <Button onClick={handleSave} disabled={!dirty || loading}>
            {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
            Save All
          </Button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 text-sm text-blue-800">
        <Info size={18} className="shrink-0 mt-0.5 text-blue-500" />
        <p>
          <strong>How it works:</strong> Members earn XP (Experience Points) by attending events,
          paying dues, and making donations. When their total XP crosses a threshold, they advance
          to the next level automatically. FP (Foundation Points) are separate and can be redeemed later.
        </p>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-100 px-4 py-3 grid grid-cols-12 gap-3 text-xs font-bold text-gray-500 uppercase tracking-widest">
          <div className="col-span-1">Lv</div>
          <div className="col-span-4">XP Required</div>
          <div className="col-span-6">Label (optional)</div>
          <div className="col-span-1"></div>
        </div>
        <div className="divide-y divide-gray-50">
          {configs.map((row, idx) => (
            <div key={idx} className="px-4 py-3 grid grid-cols-12 gap-3 items-center hover:bg-gray-50/50">
              <div className="col-span-1">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold">
                  {row.level}
                </span>
              </div>
              <div className="col-span-4">
                <div className="relative">
                  <Zap size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-amber-400" />
                  <input
                    type="number" min="1"
                    value={row.xp_required}
                    onChange={e => updateRow(idx, 'xp_required', parseInt(e.target.value) || 0)}
                    className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                  />
                </div>
              </div>
              <div className="col-span-6">
                <input
                  type="text"
                  value={row.label}
                  onChange={e => updateRow(idx, 'label', e.target.value)}
                  placeholder={`Level ${row.level}`}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
              </div>
              <div className="col-span-1 flex justify-center">
                <button
                  onClick={() => removeLevel(idx)}
                  className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
        {configs.length < 100 && (
          <div className="p-4 border-t border-dashed border-gray-100">
            <button
              onClick={addLevel}
              className="w-full py-2 rounded-xl border border-dashed border-gray-200 text-sm text-gray-400 hover:text-primary hover:border-primary transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={15} /> Add Level {configs.length > 0 ? configs[configs.length - 1].level + 1 : 1}
              <span className="text-xs">({configs.length}/100)</span>
            </button>
          </div>
        )}
      </div>

      {/* XP Progression Preview */}
      {configs.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
          <h3 className="font-bold text-gray-900 mb-4 font-heading">XP Progression Preview</h3>
          <div className="flex flex-wrap gap-3">
            {configs.slice(0, 20).map((row, idx) => (
              <div key={idx} className="flex flex-col items-center p-3 bg-gray-50 rounded-xl border border-gray-100 min-w-[80px]">
                <Trophy size={14} className={idx < 3 ? 'text-amber-400' : idx < 7 ? 'text-gray-400' : 'text-orange-400'} />
                <span className="text-xs font-bold text-gray-900 mt-1">Lv {row.level}</span>
                <span className="text-[10px] text-gray-400 mt-0.5">{row.xp_required.toLocaleString()} XP</span>
                {row.label && <span className="text-[9px] text-primary font-bold mt-1 text-center leading-tight">{row.label}</span>}
              </div>
            ))}
            {configs.length > 20 && (
              <div className="flex items-center text-xs text-gray-400 pl-2">
                +{configs.length - 20} more…
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={handleReset}
        title="Reset to Defaults?"
        message="This will replace your current level configuration with 10 default levels. You can still edit and save them."
        confirmLabel="Reset"
      />
    </div>
  );
}
