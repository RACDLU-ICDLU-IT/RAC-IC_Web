import React, { ReactNode } from 'react';

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

export const Table: React.FC<TableProps> = ({
  columns,
  data,
  renderRow,
  emptyMessage = 'No data available',
  emptyIcon,
  isLoading = false,
}) => {
  return (
    <div className="w-full overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-100">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap sticky top-0 bg-gray-50 z-10"
                style={{ width: col.width }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {columns.map((col) => (
                  <td key={col.key} className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-full"></div>
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-16 text-center">
                <div className="flex flex-col items-center justify-center text-gray-400">
                  {emptyIcon && <div className="mb-4">{emptyIcon}</div>}
                  <p className="text-gray-500 font-medium">{emptyMessage}</p>
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
