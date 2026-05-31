import React from 'react';
import { Card } from '../ui/Card';
import { DuesStats } from '../../hooks/useDues';
import { TrendingUp, AlertCircle, Clock, Percent, CheckCircle, XCircle } from 'lucide-react';

interface DuesSummaryCardsProps {
  stats: DuesStats | null;
  loading: boolean;
}

export function DuesSummaryCards({ stats, loading }: DuesSummaryCardsProps) {
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', minimumFractionDigits: 2 }).format(amount);
  };

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="h-10 w-10 bg-gray-200 rounded-full mb-3" />
            <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
            <div className="h-6 w-32 bg-gray-200 rounded" />
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: 'Total Collected',
      value: formatAmount(stats.totalCollected),
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-100',
    },
    {
      title: 'Outstanding',
      value: formatAmount(stats.totalOutstanding),
      icon: AlertCircle,
      color: 'text-red-600',
      bg: 'bg-red-100',
    },
    {
      title: 'Overdue Entries',
      value: `${stats.overdueCount} entries`,
      icon: Clock,
      color: 'text-orange-600',
      bg: 'bg-orange-100',
    },
    {
      title: 'Collection Rate',
      value: `${stats.collectionRate.toFixed(1)}%`,
      icon: Percent,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
      progress: stats.collectionRate,
    },
    {
      title: 'Paid This Month',
      value: formatAmount(stats.paidThisMonth),
      icon: CheckCircle,
      color: 'text-emerald-600',
      bg: 'bg-emerald-100',
    },
    {
      title: 'Unpaid This Month',
      value: `${stats.unpaidThisMonth} entries`,
      value2: formatAmount(stats.unpaidThisMonth),
      icon: XCircle,
      color: 'text-yellow-600',
      bg: 'bg-yellow-100',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((c, i) => (
        <Card key={i} className="p-4 flex flex-col justify-center relative overflow-hidden">
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${c.bg} ${c.color}`}>
              <c.icon className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-medium text-gray-500">{c.title}</h3>
          </div>
          <div className="text-xl font-bold text-gray-900">{c.value}</div>
          
          {c.progress !== undefined && (
            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-3">
              <div 
                className="bg-blue-600 h-1.5 rounded-full" 
                style={{ width: `${Math.min(100, Math.max(0, c.progress))}%` }}
              ></div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
