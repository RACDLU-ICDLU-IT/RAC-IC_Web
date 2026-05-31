import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical, Trash2, Copy, ToggleLeft, ToggleRight,
  List, CheckSquare, ChevronDown, Sliders, Grid, LayoutList, Image, Type, Upload
} from 'lucide-react';
import { FormField } from '../../types/forms';

interface FieldCardProps {
  field: FormField;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (field: FormField) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

export const FieldCard: React.FC<FieldCardProps> = ({
  field,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onDuplicate,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const getIcon = () => {
    switch (field.type) {
      case 'short_answer': return <Type size={16} className="text-blue-500" />;
      case 'paragraph': return <List size={16} className="text-violet-500" />;
      case 'multiple_choice': return <List size={16} className="text-teal-500" />;
      case 'checkboxes': return <CheckSquare size={16} className="text-amber-500" />;
      case 'dropdown': return <ChevronDown size={16} className="text-sky-500" />;
      case 'linear_scale': return <Sliders size={16} className="text-emerald-500" />;
      case 'multiple_choice_grid': return <Grid size={16} className="text-pink-500" />;
      case 'checkbox_grid': return <Grid size={16} className="text-rose-500" />;
      case 'image': return <Image size={16} className="text-cyan-500" />;
      case 'section': return <LayoutList size={16} className="text-fuchsia-500" />;
      case 'file_upload': return <Upload size={16} className="text-indigo-500" />;
      default: return <Type size={16} className="text-gray-500" />;
    }
  };

  const getFriendlyType = () => {
    return field.type.replace(/_/g, ' ');
  };

  const choices = field.options?.choices || [];
  const rows = field.options?.rows || [];
  const cols = field.options?.columns || [];

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`bg-white rounded-xl border transition-all cursor-pointer select-none p-5 relative group ${
        isSelected
          ? 'border-accent ring-2 ring-accent/15 shadow-md'
          : 'border-gray-200 hover:border-gray-300 shadow-sm'
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Grip handle for dragging */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical size={16} />
        </div>

        <div className="flex-1 pl-4 md:pl-5">
          {/* Badge & Required Label */}
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-gray-50 text-gray-500 rounded border border-gray-100">
              {getIcon()}
              {getFriendlyType()}
            </span>
            {field.required && (
              <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                Required
              </span>
            )}
          </div>

          {/* Title or Label */}
          <h4 className="font-medium text-gray-900 text-sm md:text-base">
            {field.label || <span className="text-gray-400 italic">Untitled Field</span>}
          </h4>

          {/* Description */}
          {field.description && (
            <p className="text-xs text-gray-400 mt-1 max-w-2xl">{field.description}</p>
          )}

          {/* Type-Specific Previews */}
          <div className="mt-4 border-t border-gray-50 pt-4 text-xs text-gray-500">
            {field.type === 'short_answer' && (
              <div className="border border-gray-200 rounded px-3 py-2 bg-gray-50 max-w-sm text-gray-400">
                {field.placeholder || 'Respondent enters a single line of text...'}
              </div>
            )}

            {field.type === 'paragraph' && (
              <div className="border border-gray-200 rounded px-3 py-4 bg-gray-50 text-gray-400">
                {field.placeholder || 'Respondent enters longer response paragraphs here...'}
              </div>
            )}

            {(field.type === 'multiple_choice' || field.type === 'checkboxes' || field.type === 'dropdown') && (
              <div className="flex flex-col gap-1.5">
                {choices.length === 0 ? (
                  <p className="text-gray-400 italic">No options defined.</p>
                ) : (
                  choices.map((choice, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className={`w-3.5 h-3.5 border border-gray-300 bg-white ${field.type === 'multiple_choice' ? 'rounded-full' : 'rounded'}`} />
                      <span>{choice}</span>
                    </div>
                  ))
                )}
                {field.options?.allowOther && (
                  <div className="flex items-center gap-2 text-gray-400">
                    <div className={`w-3.5 h-3.5 border border-gray-300 bg-white ${field.type === 'multiple_choice' ? 'rounded-full' : 'rounded'}`} />
                    <span>Other...</span>
                  </div>
                )}
              </div>
            )}

            {field.type === 'linear_scale' && (
              <div className="flex items-center gap-3">
                <span className="font-semibold text-gray-700">{field.scale_min ?? 1}</span>
                {field.scale_min_label && <span className="text-gray-400">({field.scale_min_label})</span>}
                <div className="flex gap-1 h-1.5 w-24 bg-gray-100 rounded overflow-hidden">
                  <div className="bg-emerald-400 h-full w-2/3 rounded" />
                </div>
                <span className="font-semibold text-gray-700">{field.scale_max ?? 5}</span>
                {field.scale_max_label && <span className="text-gray-400">({field.scale_max_label})</span>}
              </div>
            )}

            {field.type === 'image' && (
              <div className="max-w-sm border border-gray-100 rounded-lg overflow-hidden bg-gray-50 p-2">
                {field.image_url ? (
                  <img src={field.image_url} alt="Display preview" className="w-full max-h-36 object-contain" />
                ) : (
                  <p className="text-gray-400 italic text-center py-4">No image selected or uploaded yet.</p>
                )}
              </div>
            )}

            {(field.type === 'multiple_choice_grid' || field.type === 'checkbox_grid') && (
              <div className="overflow-x-auto max-w-full">
                <table className="min-w-full text-center border-collapse text-[11px]">
                  <thead>
                    <tr>
                      <th className="px-2 py-1 border-b border-gray-100"></th>
                      {cols.map((col, cId) => (
                        <th key={cId} className="px-2 py-1 border-b border-gray-100 font-semibold text-gray-700">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, rId) => (
                      <tr key={rId}>
                        <td className="px-2 py-1 text-left font-medium text-gray-600 border-b border-gray-50">{row}</td>
                        {cols.map((_, cId) => (
                          <td key={cId} className="px-2 py-1 border-b border-gray-50 select-none">
                            <div className={`w-3 h-3 mx-auto border border-gray-300 ${field.type === 'multiple_choice_grid' ? 'rounded-full' : 'rounded'}`} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {field.type === 'date' && (
              <div className="border border-gray-200 rounded px-3 py-2 bg-gray-50 max-w-xs text-gray-400">
                MM/DD/YYYY (Date Picker)
              </div>
            )}

            {field.type === 'time' && (
              <div className="border border-gray-200 rounded px-3 py-2 bg-gray-50 max-w-xs text-gray-400">
                HH:MM AM/PM (Time Picker)
              </div>
            )}

            {field.type === 'section' && (
              <div className="bg-fuchsia-50/20 p-3 rounded-lg border border-fuchsia-100/50">
                <p className="font-semibold text-fuchsia-800 text-xs">Section Break Divider</p>
                <p className="text-gray-400 text-xs mt-0.5">Visually separates sections on the respondent form.</p>
              </div>
            )}

            {field.type === 'file_upload' && (
              <div className="border border-gray-200 border-dashed rounded px-4 py-3 bg-gray-50 flex items-center justify-center gap-2 max-w-xs text-gray-400">
                <Upload size={14} />
                <span>Upload attachment (Cloudinary bucket storage)</span>
              </div>
            )}
          </div>
        </div>

        {/* Core Quick Config Buttons */}
        <div className="flex flex-col items-end gap-3 justify-between shrink-0 h-full">
          {/* Controls Bar */}
          <div className="flex gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700 transition-colors"
              title="Duplicate Field"
            >
              <Copy size={14} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500 transition-colors"
              title="Delete Field"
            >
              <Trash2 size={14} />
            </button>
          </div>

          {/* Required Fields Toggle inside Builder Card */}
          {field.type !== 'section' && field.type !== 'image' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUpdate({
                  ...field,
                  required: !field.required,
                });
              }}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors pr-1"
              title="Toggle Required"
            >
              <span className="text-[10px] uppercase font-bold tracking-wider">Req</span>
              {field.required ? (
                <ToggleRight size={18} className="text-accent" />
              ) : (
                <ToggleLeft size={18} />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
