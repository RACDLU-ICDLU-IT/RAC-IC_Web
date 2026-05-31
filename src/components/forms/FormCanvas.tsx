import React from 'react';
import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { FormField } from '../../types/forms';
import { FieldCard } from './FieldCard';
import { FileText, Plus } from 'lucide-react';

interface FormCanvasProps {
  fields: FormField[];
  selectedFieldId: string | null;
  onSelectField: (id: string) => void;
  onUpdateField: (field: FormField) => void;
  onDeleteField: (id: string) => void;
  onDuplicateField: (id: string) => void;
  onReorderFields: (startIndex: number, endIndex: number) => void;
  onAddSection: (index: number) => void;
}

export const FormCanvas: React.FC<FormCanvasProps> = ({
  fields,
  selectedFieldId,
  onSelectField,
  onUpdateField,
  onDeleteField,
  onDuplicateField,
  onReorderFields,
  onAddSection,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Avoid triggering drag on tiny clicks
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const activeIndex = fields.findIndex((f) => f.id === active.id);
      const overIndex = fields.findIndex((f) => f.id === over.id);
      onReorderFields(activeIndex, overIndex);
    }
  };

  return (
    <div className="flex flex-col gap-4 min-h-[400px]">
      {fields.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-200 rounded-xl bg-white text-center">
          <FileText size={40} className="text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Your Form is Empty</p>
          <p className="text-xs text-gray-400 mt-1 max-w-xs">
            Add elements from the palette on the left to start composing your form form fields.
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={fields.map((f) => f.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-4">
              {fields.map((field, idx) => (
                <div key={field.id} className="group/item relative">
                  <FieldCard
                    field={field}
                    isSelected={selectedFieldId === field.id}
                    onSelect={() => onSelectField(field.id)}
                    onUpdate={onUpdateField}
                    onDelete={() => onDeleteField(field.id)}
                    onDuplicate={() => onDuplicateField(field.id)}
                  />
                  
                  {/* Inline Add Section Button between elements */}
                  {field.type !== 'section' && (
                    <div className="absolute left-0 right-0 -bottom-3 flex justify-center opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity z-10 pointer-events-none">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddSection(idx + 1);
                        }}
                        className="pointer-events-auto flex items-center gap-1.5 px-3 py-1 bg-accent text-primary rounded-full text-[10px] font-bold shadow hover:bg-neutral-800 hover:text-white transition-all transform hover:scale-105"
                      >
                        <Plus size={10} />
                        Add Section Break
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
};
