import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Type, Hash, Calendar, ToggleLeft, AlignLeft, List, Disc, Layers, Clock, Star, BarChartHorizontal, Upload, Grid3X3, Table, Link2, Heading, Info, Divide, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { FormField } from '@/types/schema';
import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';

import { useFormStore } from '@/store/useFormStore';

interface SortableFieldProps {
  field: FormField;
  onRemove: (id: string) => void;
  onSelect: (id: string) => void;
  isSelected?: boolean;
  isNested?: boolean;
}

/** Map each FieldType to its icon and category color */
const FIELD_TYPE_META: Record<string, { icon: any; iconColor: string; iconBg: string; label: string }> = {
  TEXT: { icon: Type, iconColor: '#3b82f6', iconBg: '#eff6ff', label: 'Text Input' },
  NUMERIC: { icon: Hash, iconColor: '#3b82f6', iconBg: '#eff6ff', label: 'Number' },
  DATE: { icon: Calendar, iconColor: '#3b82f6', iconBg: '#eff6ff', label: 'Date Picker' },
  BOOLEAN: { icon: ToggleLeft, iconColor: '#3b82f6', iconBg: '#eff6ff', label: 'Checkbox' },
  TEXTAREA: { icon: AlignLeft, iconColor: '#3b82f6', iconBg: '#eff6ff', label: 'Long Text' },
  DROPDOWN: { icon: List, iconColor: '#8b5cf6', iconBg: '#f5f3ff', label: 'Dropdown' },
  RADIO: { icon: Disc, iconColor: '#8b5cf6', iconBg: '#f5f3ff', label: 'Multiple Choice' },
  CHECKBOX_GROUP: { icon: Layers, iconColor: '#8b5cf6', iconBg: '#f5f3ff', label: 'Checkboxes' },
  TIME: { icon: Clock, iconColor: '#f59e0b', iconBg: '#fffbeb', label: 'Time' },
  RATING: { icon: Star, iconColor: '#f59e0b', iconBg: '#fffbeb', label: 'Star Rating' },
  SCALE: { icon: BarChartHorizontal, iconColor: '#f59e0b', iconBg: '#fffbeb', label: 'Linear Scale' },
  FILE: { icon: Upload, iconColor: '#f59e0b', iconBg: '#fffbeb', label: 'File Upload' },
  GRID_RADIO: { icon: Grid3X3, iconColor: '#10b981', iconBg: '#ecfdf5', label: 'Choice Grid' },
  GRID_CHECK: { icon: Table, iconColor: '#10b981', iconBg: '#ecfdf5', label: 'Checkbox Grid' },
  LOOKUP: { icon: Link2, iconColor: '#ec4899', iconBg: '#fdf2f8', label: 'Linked Data' },
  SECTION_HEADER: { icon: Heading, iconColor: '#64748b', iconBg: '#f1f5f9', label: 'Section' },
  INFO_LABEL: { icon: Info, iconColor: '#64748b', iconBg: '#f1f5f9', label: 'Info / Label' },
  PAGE_BREAK: { icon: Divide, iconColor: '#ec4899', iconBg: '#fdf2f8', label: 'Page Break' },
};

export function SortableField({ field, onRemove, onSelect, isNested = false }: SortableFieldProps) {
  const selectedFieldId = useFormStore(state => state.selectedFieldId);
  const isSelected = selectedFieldId === field.id;
  const [isExpanded, setIsExpanded] = useState(true);
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: field.id });
  const { setNodeRef: setSectionDropRef, isOver: isSectionOver } = useDroppable({
    id: `section-${field.id}`,
    data: { isSection: true, parentId: field.id }
  });

  const meta = FIELD_TYPE_META[field.type] || FIELD_TYPE_META.TEXT;
  const FieldIcon = meta.icon;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isSection = field.type === 'SECTION_HEADER';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group/field ${isNested ? 'ml-4' : ''}`}
    >
      <div
        className={`relative flex items-center gap-3 p-4 mb-2 rounded-xl border cursor-pointer transition-all duration-150 ${isSelected ? 'shadow-md scale-[1.01]' : 'shadow-sm'}`}
        style={{
          background: 'var(--card-bg)',
          borderColor: isSelected ? 'var(--accent)' : 'var(--card-border)',
          boxShadow: isSelected
            ? '0 0 0 3px var(--accent-muted)'
            : 'var(--card-shadow)',
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(field.id);
        }}
      >
        {/* Grip Handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing shrink-0 transition-colors"
          style={{ color: 'var(--text-faint)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={18} />
        </div>

        {field.type === 'PAGE_BREAK' ? (
          <div className="flex-1 flex items-center gap-4 py-2">
            <div className="h-0.5 flex-1 rounded-full opacity-20" style={{ background: 'var(--accent)' }} />
            <div className="flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest"
              style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)', color: 'var(--accent)' }}>
              <Divide size={12} />
              Page End / New Step
            </div>
            <div className="h-0.5 flex-1 rounded-full opacity-20" style={{ background: 'var(--accent)' }} />
          </div>
        ) : (
          <>
            {/* Collapse/Expand for Sections */}
            {isSection && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
                style={{ color: 'var(--text-muted)' }}
              >
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
            )}

            {/* Field Type Icon */}
            <div
              className="p-2 rounded-lg shrink-0"
              style={{ background: meta.iconBg }}
            >
              <FieldIcon size={16} style={{ color: meta.iconColor }} />
            </div>

            {/* Field content preview */}
            <div className="flex-1 min-w-0 pointer-events-none">
              <div className="flex items-center gap-2">
                <label
                  className={`text-sm font-semibold truncate ${isSection ? 'text-base' : ''}`}
                  style={{ color: 'var(--text-primary)' }}
                >
                  {field.label || 'Untitled Field'}
                </label>
                {field.validation.required && (
                  <span className="text-red-500 text-xs font-bold shrink-0">*</span>
                )}
              </div>
              <div className="text-[11px] mt-0.5 font-medium" style={{ color: 'var(--text-faint)' }}>
                {meta.label}
              </div>
            </div>
          </>
        )}

        {/* Delete Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(field.id);
          }}
          className="p-2 rounded-lg transition-all shrink-0 opacity-0 group-hover/field:opacity-100 hover:bg-red-50 hover:text-red-600"
          style={{ color: 'var(--text-faint)' }}
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Children Container (for Sections) */}
      {isSection && isExpanded && (
        <div
          ref={setSectionDropRef}
          className={`ml-8 mt-1 mb-4 p-4 rounded-xl border-2 border-dashed transition-all min-h-[50px] ${isSectionOver ? 'border-accent bg-accent-subtle ring-4 ring-accent-muted' : 'border-transparent bg-gray-50/50'}`}
        >
          <SortableContext items={field.children?.map(c => c.id) || []} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {field.children && field.children.length > 0 ? (
                field.children.map(child => (
                  <SortableField
                    key={child.id}
                    field={child}
                    onRemove={onRemove}
                    onSelect={onSelect}
                    isNested={true}
                  />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-6 opacity-30">
                  <Plus size={20} className="mb-1" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Drop fields here</span>
                </div>
              )}
            </div>
          </SortableContext>
        </div>
      )}
    </div>
  );
}
