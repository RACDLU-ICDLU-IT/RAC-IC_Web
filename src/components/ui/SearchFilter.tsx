import React, { ReactNode } from 'react';
import { Search } from 'lucide-react';

interface SearchFilterProps {
  searchValue: string;
  onSearchChange: (val: string) => void;
  filters?: {
    label: string;
    value: string;
    options: { label: string; value: string }[];
  }[];
  onFilterChange?: (filterLabel: string, val: string) => void;
  actions?: ReactNode;
}

export const SearchFilter: React.FC<SearchFilterProps> = ({
  searchValue,
  onSearchChange,
  filters = [],
  onFilterChange,
  actions,
}) => {
  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-4 px-6 bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
      <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors bg-gray-50"
          />
        </div>
        {filters.map((filter) => (
          <select
            key={filter.label}
            value={filter.value}
            onChange={(e) => onFilterChange && onFilterChange(filter.label, e.target.value)}
            className="w-full md:w-auto px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors"
          >
            {filter.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ))}
      </div>
      {actions && <div className="flex shrink-0 w-full md:w-auto mt-4 md:mt-0 justify-end">{actions}</div>}
    </div>
  );
};
