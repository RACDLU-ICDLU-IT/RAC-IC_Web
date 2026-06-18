import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePoints, PointLedgerEntry, LevelConfig } from '../../hooks/usePoints';
import { useTenant } from '../../hooks/useTenant';
import { Zap, Star, Trophy, TrendingUp, HandCoins, CheckSquare, CreditCard, Wand2 } from 'lucide-react';

function PointBadge({ type, value, label }: { type: 'xp' | 'fp'; value: number; label?: string }) {
  const isXP = type === 'xp';
  return (
    <div className={`flex flex-col items-center p-6 rounded-3xl text-white relative overflow-hidden ${isXP ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-gradient-to-br from-purple-600 to-indigo-700'}`}>
      <div className="absolute inset-0 bg-white/5 rounded-3xl" />
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 ${isXP ? 'bg-amber-400/30' : 'bg-purple-500/30'}`}>
        {isXP ? <Zap size={28} className="text-amber-200" /> : <Star size={28} className="text-purple-200" />}
      </div>
      <p className="text-4xl font-heading font-bold tracking-tight">{value.toLocaleString()}</p>
      <p className="text-sm font-bold text-white/70 mt-1 uppercase tracking-widest">{label || (isXP ? 'Experience Points' : 'Foundation Points')}</p>
    </div>
  );
}

function LevelBadge({ level, configs }: { level: number; configs: LevelConfig[] }) {
  const currentConfig = configs.find(c => c.level === level);
  const nextConfig = configs.find(c => c.level === level + 1);
  return (
    <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex items-center gap-5">
      <div className="relative shrink-0">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
          <Trophy size={28} className="text-white" />
        </div>
        <span className="absolute -top-1 -right-1 bg-accent text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow">
          Lv {level}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-0.5">Current Level</p>
        <p className="font-heading font-bold text-xl text-gray-900">{currentConfig?.label || `Level ${level}`}</p>
        {nextConfig && (
          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
            <TrendingUp size={11} />
            Next: <strong className="text-gray-600">{nextConfig.label || `Level ${nextConfig.level}`}</strong>
            &nbsp;at {nextConfig.xp_required.toLocaleString()} XP
          </p>
        )}
        {!nextConfig && level > 0 && (
          <p className="text-xs text-green-600 font-bold mt-1">🏆 Max level reached!</p>
        )}
      </div>
    </div>
  );
}

const SOURCE_ICONS: Record<string, React.ElementType> = {
  due_payment: CreditCard,
  attendance:  CheckSquare,
  donation:    HandCoins,
  manual:      Wand2,
};

const SOURCE_LABELS: Record<string, string> = {
  due_payment: 'Due Payment',
  attendance:  'Event Attendance',
  donation:    'Donation',
  manual:      'Manual Award',
};

export default function MemberPoints() {
  const { user, profile } = useAuth();
  const { tenant } = useTenant();
  const { fetchMemberPoints, fetchMemberPointLedger, fetchLevelConfigs } = usePoints();
  const [points, setPoints] = useState({ xp: 0, fp: 0, level: 0 });
  const [ledger, setLedger] = useState<PointLedgerEntry[]>([]);
  const [levelConfigs, setLevelConfigs] = useState<LevelConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      fetchMemberPoints(user.id),
      fetchMemberPointLedger(user.id),
      fetchLevelConfigs(),
    ]).then(([pts, led, lvls]) => {
      setPoints(pts);
      setLedger(led);
      setLevelConfigs(lvls);
      setLoading(false);
    });
  }, [user?.id, tenant.id]);

  const currentLevelConfig = levelConfigs.find(c => c.level === points.level);
  const nextLevel = levelConfigs.find(c => c.level === points.level + 1);
  // XP earned since the start of the current level (not total XP vs next threshold)
  const currentLevelXP = currentLevelConfig?.xp_required || 0;
  const nextLevelXP = nextLevel?.xp_required || currentLevelXP;
  const xpIntoCurrentLevel = Math.max(0, points.xp - currentLevelXP);
  const xpNeededForNextLevel = Math.max(1, nextLevelXP - currentLevelXP);
  const progressPct = nextLevel
    ? Math.min(100, Math.round((xpIntoCurrentLevel / xpNeededForNextLevel) * 100))
    : 100;

  if (loading) {
    return <div className="p-12 flex justify-center"><div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-heading font-bold text-gray-900">My Points</h1>
        <p className="text-gray-500 mt-1 text-sm">Track your XP, Foundation Points, and level progress.</p>
      </div>

      {/* Point badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <PointBadge type="xp" value={points.xp} />
        <PointBadge type="fp" value={points.fp} />
      </div>

      {/* Level card */}
      <LevelBadge level={points.level} configs={levelConfigs} />

      {/* XP Progress bar */}
      {nextLevel && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-2 text-sm">
            <span className="font-bold text-gray-700 flex items-center gap-1.5"><Zap size={14} className="text-amber-400" /> XP Progress to Level {nextLevel.level}</span>
            <span className="font-bold text-gray-500">{xpIntoCurrentLevel.toLocaleString()} / {xpNeededForNextLevel.toLocaleString()} XP</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1.5">{progressPct}% to next level · Total XP: {points.xp.toLocaleString()}</p>
        </div>
      )}

      {/* FP Info */}
      <div className="bg-purple-50 border border-purple-100 rounded-2xl p-5 text-sm text-purple-800">
        <strong>What are Foundation Points (FP)?</strong> FP are backed by the club's Endowment Fund and can be redeemed
        for Paul Harris Fellow (PHF) recognition and other Rotary Foundation purposes. Unlike XP, FP have real monetary
        backing in the club's endowment reserve.
      </div>

      {/* History */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="font-heading font-bold text-lg">Point History</h3>
        </div>
        {ledger.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <Zap size={32} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">No point history yet. Attend events and pay dues to earn points!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {ledger.map(entry => {
              const Icon = SOURCE_ICONS[entry.source_type] || Wand2;
              return (
                <div key={entry.id} className="px-5 py-4 flex items-center gap-4">
                  <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                    <Icon size={16} className="text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900">{SOURCE_LABELS[entry.source_type] || entry.source_type}</p>
                    {entry.note && <p className="text-xs text-gray-400 truncate">{entry.note}</p>}
                    <p className="text-[10px] text-gray-300 mt-0.5">{new Date(entry.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right shrink-0 space-y-0.5">
                    {entry.xp_delta !== 0 && (
                      <p className={`text-sm font-bold flex items-center gap-0.5 justify-end ${entry.xp_delta > 0 ? 'text-amber-600' : 'text-red-500'}`}>
                        <Zap size={12} /> {entry.xp_delta > 0 ? '+' : ''}{entry.xp_delta} XP
                      </p>
                    )}
                    {entry.fp_delta !== 0 && (
                      <p className={`text-sm font-bold flex items-center gap-0.5 justify-end ${entry.fp_delta > 0 ? 'text-purple-600' : 'text-red-500'}`}>
                        <Star size={12} /> {entry.fp_delta > 0 ? '+' : ''}{entry.fp_delta} FP
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
