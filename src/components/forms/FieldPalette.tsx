import React from 'react';
import {
  Type, AlignLeft, ListTodo, CheckSquare, ChevronDown, Sliders,
  Grid, Grid3X3, Calendar, Clock, Image, FileText, Upload, LucideIcon
} from 'lucide-react';
import { FieldType } from '../../types/forms';

interface PaletteItem {
  type: FieldType;
  label: string;
  icon: LucideIcon;
  category: 'Standard' | 'Choice' | 'Advanced' | 'Layout';
}

const PALETTE_ITEMS: PaletteItem[] = [
  { type: 'short_answer', label: 'Short Answer', icon: Type, category: 'Standard' },
  { type: 'paragraph', label: 'Paragraph Text', icon: AlignLeft, category: 'Standard' },
  { type: 'multiple_choice', label: 'Multiple Choice', icon: ListTodo, category: 'Choice' },
  { type: 'checkboxes', label: 'Checkboxes', icon: CheckSquare, category: 'Choice' },
  { type: 'dropdown', label: 'Dropdown List', icon: ChevronDown, category: 'Choice' },
  { type: 'linear_scale', label: 'Linear Scale', icon: Sliders, category: 'Advanced' },
  { type: 'multiple_choice_grid', label: 'MC Grid', icon: Grid, category: 'Advanced' },
  { type: 'checkbox_grid', label: 'Checkbox Grid', icon: Grid3X3, category: 'Advanced' },
  { type: 'date', label: 'Date Picker', icon: Calendar, category: 'Standard' },
  { type: 'time', label: 'Time Picker', icon: StandardIconForTime(), category: 'Standard' },
  { type: 'image', label: 'Image Box', icon: Image, category: 'Layout' },
  { type: 'section', label: 'Section Divider', icon: FileText, category: 'Layout' },
  { type: 'file_upload', label: 'File Upload', icon: Upload, category: 'Advanced' },
];

function StandardIconForTime() {
  return Clock;
}

interface FieldPaletteProps {
  onAddField: (type: FieldType) => void;
}

export const FieldPalette: React.FC<FieldPaletteProps> = ({ onAddField }) => {
  const categories: ('Standard' | 'Choice' | 'Advanced' | 'Layout')[] = [
    'Standard',
    'Choice',
    'Advanced',
    'Layout',
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex flex-col gap-5 sticky top-5">
      <div>
        <h3 className="font-heading font-bold text-gray-900 text-sm uppercase tracking-wider mb-1">
          Field Palette
        </h3>
        <p className="text-xs text-gray-400">Click a component to append to the end of the form.</p>
      </div>

      <div className="flex flex-col gap-4">
        {categories.map((category) => {
          const items = PALETTE_ITEMS.filter((item) => item.category === category);
          if (items.length === 0) return null;

          return (
            <div key={category} className="flex flex-col gap-2">
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">
                {category}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => onAddField(item.type)}
                      className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-100 text-gray-600 hover:border-accent hover:text-accent hover:bg-accent/5 hover:scale-[1.02] active:scale-[0.98] transition-all text-left text-xs font-medium bg-gray-50/50"
                    >
                      <Icon size={14} className="shrink-0 text-gray-400" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
