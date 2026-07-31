import React, { ReactNode } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useTenant } from '../../hooks/useTenant';
import { getClubPalette } from '../../theme/racPalette';

interface Column {
  key: string;
  label: ReactNode;
  width?: string;
}

interface TableProps {
  columns: Column[];
  data: any[];
  renderRow: (row: any, i: number) => ReactNode;
  emptyMessage?: string;
  emptyIcon?: ReactNode;
  isLoading?: boolean;
}

/**
 * ------------------------------------------------------------------
 * Visual identity — matches DashboardHome.tsx's card language: the
 * same getClubPalette(tenant.id, theme) palette object, the same
 * rounded-20px dark card with a p.border hairline in dark mode, same
 * approach in light mode (a plain light card, no heavy tenant-brand
 * tinting — DashboardHome's own "lightCard" surfaces use this too).
 *
 * Table.tsx is shared across BOTH admin and non-admin (student/
 * teacher/parent) pages, so this deliberately uses useTenant() — safe
 * everywhere — not useAdminTenant(), which would throw outside admin
 * routes. Same reasoning DashboardHome.tsx itself follows.
 *
 * Previously this component was theme-blind: hardcoded bg-white /
 * bg-gray-50 / text-gray-500 regardless of the app's light/dark
 * setting or which tenant was rendering it. Callers that reached for
 * their own theme-flipping colors inside renderRow (assuming Table
 * would host a dark background) ran into a light-mode contrast bug —
 * see AdminApplications.tsx's history. Making Table itself
 * theme-aware, rather than leaving that burden on every caller, is
 * the actual fix: renderRow content can now safely use the palette's
 * light-on-dark or dark-on-light pairing because Table guarantees
 * which one is actually behind it.
 * ------------------------------------------------------------------
 */
export const Table: React.FC<TableProps> = ({
  columns,
  data,
  renderRow,
  emptyMessage = 'No data available',
  emptyIcon,
  isLoading = false,
}) => {
  const { tenant } = useTenant();
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === 'dark';
  const p = getClubPalette(tenant.id, dark ? 'dark' : 'light');

  // In dark mode: DashboardHome's dark card (p.dark bg, p.border hairline,
  // p.tl/p.tsub text). In light mode: DashboardHome's "lightCard" surface
  // (p.lightCard bg, p.td text) — the same pairing DashboardHome itself
  // uses for its light-surfaced cards (Tracking, Attendance rate), so a
  // table dropped into either theme reads as part of the same design
  // system rather than a foreign white box.
  const cardBg = dark ? p.dark : p.lightCard;
  const headerBg = dark ? p.dark : p.lightCard;
  const headerText = dark ? p.tsub : p.mut;
  const bodyText = dark ? p.tl : p.td;
  const subText = dark ? p.tsub : p.mut;
  const borderColor = dark ? p.border : 'rgba(0,0,0,0.06)';
  const skeletonColor = dark ? p.border : 'rgba(0,0,0,0.08)';

  return (
    <div
      className="w-full overflow-x-auto rac-table-shell"
      style={{
        background: cardBg,
        borderRadius: 20,
        border: `1px solid ${borderColor}`,
        boxShadow: dark ? 'none' : '0 1px 2px rgba(0,0,0,0.04)',
      }}
    >
      <style>{`
        .rac-table-shell table { border-collapse: collapse; width: 100%; text-align: left; }
        .rac-table-shell th, .rac-table-shell td { white-space: nowrap; }
      `}</style>
      <table>
        <thead>
          <tr style={{ background: headerBg, borderBottom: `1px solid ${borderColor}` }}>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-6 py-4 text-xs font-bold uppercase tracking-wider sticky top-0 z-10"
                style={{ width: col.width, color: headerText, background: headerBg }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${borderColor}` }}>
                {columns.map((col) => (
                  <td key={col.key} className="px-6 py-4">
                    <div
                      className="h-4 rounded animate-pulse w-full"
                      style={{ background: skeletonColor }}
                    ></div>
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-16 text-center">
                <div className="flex flex-col items-center justify-center" style={{ color: subText }}>
                  {emptyIcon && <div className="mb-4">{emptyIcon}</div>}
                  <p className="font-medium" style={{ color: bodyText }}>{emptyMessage}</p>
                </div>
              </td>
            </tr>
          ) : (
            data.map((row, i) => renderRow(row, i))
          )}
        </tbody>
      </table>
    </div>
  );
};
