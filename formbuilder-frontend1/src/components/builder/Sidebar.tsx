// src/components/builder/Sidebar.tsx
'use client';

/**
 * Sidebar — Field Type Palette for the Form Builder
 *
 * What it does:
 *   Renders the left panel of the builder with all available field types. Each type
 *   is displayed as a {@link DraggableSidebarBtn} that can be dragged onto the Canvas
 *   to add a new field.
 *
 * FIELD_TYPES array:
 *   Exported so that the builder page (builder/page.tsx) can reference it when
 *   rendering the DragOverlay tooltip — the active dragged field type's label and
 *   icon are looked up here.
 *
 * Field types are grouped by category (basic, choice, special, grid, lookup).
 */

import { FieldType } from '@/types/schema';
import { Type, Hash, Calendar, ToggleLeft, AlignLeft, List, Disc, Layers, Clock, Star, BarChartHorizontal, Upload, Grid3X3, Table, Link2, Heading, Info, Divide, CalendarClock } from 'lucide-react';
import { DraggableSidebarBtn } from './DraggableSidebarBtn';

/** Each group has a label displayed as a section header in the sidebar. */
interface FieldGroup {
  label: string;
  color: string; // accent color for the category header
  fields: { type: FieldType; label: string; icon: any; category: string }[];
}

/** Registry of all draggable field types, organised into display groups. */
export const FIELD_TYPES = [
  // Basic input types
  { type: 'TEXT' as FieldType, label: 'Text Input', icon: Type, category: 'basic' },
  { type: 'NUMERIC' as FieldType, label: 'Number', icon: Hash, category: 'basic' },
  { type: 'DATE' as FieldType, label: 'Date Picker', icon: Calendar, category: 'basic' },
  { type: 'DATE_TIME' as FieldType, label: 'Date & Time', icon: CalendarClock, category: 'basic' },
  { type: 'BOOLEAN' as FieldType, label: 'Checkbox', icon: ToggleLeft, category: 'basic' },
  { type: 'TEXTAREA' as FieldType, label: 'Long Text', icon: AlignLeft, category: 'basic' },

  // Choice types (require options configuration in PropertiesPanel)
  { type: 'DROPDOWN' as FieldType, label: 'Dropdown', icon: List, category: 'choice' },
  { type: 'RADIO' as FieldType, label: 'Multiple Choice', icon: Disc, category: 'choice' },
  { type: 'CHECKBOX_GROUP' as FieldType, label: 'Checkboxes', icon: Layers, category: 'choice' },

  // Special input types
  { type: 'TIME' as FieldType, label: 'Time', icon: Clock, category: 'special' },
  { type: 'RATING' as FieldType, label: 'Star Rating', icon: Star, category: 'special' },
  { type: 'SCALE' as FieldType, label: 'Linear Scale', icon: BarChartHorizontal, category: 'special' },
  { type: 'FILE' as FieldType, label: 'File Upload', icon: Upload, category: 'special' },

  // Grid types (require rows + cols configuration)
  { type: 'GRID_RADIO' as FieldType, label: 'Multiple Choice Grid', icon: Grid3X3, category: 'grid' },
  { type: 'GRID_CHECK' as FieldType, label: 'Checkbox Grid', icon: Table, category: 'grid' },

  // Linked data (requires source form + column configuration)
  { type: 'LOOKUP' as FieldType, label: 'Linked Data', icon: Link2, category: 'lookup' },

  // Layout / Static elements
  { type: 'SECTION_HEADER' as FieldType, label: 'Section Header', icon: Heading, category: 'layout' },
  { type: 'INFO_LABEL' as FieldType, label: 'Info / Label', icon: Info, category: 'layout' },
  { type: 'PAGE_BREAK' as FieldType, label: 'Page Break', icon: Divide, category: 'layout' },
];

/** Category metadata for the sidebar section headers */
const GROUPS: FieldGroup[] = [
  {
    label: 'Basic',
    color: '#3b82f6',
    fields: FIELD_TYPES.filter(f => f.category === 'basic'),
  },
  {
    label: 'Choice',
    color: '#8b5cf6',
    fields: FIELD_TYPES.filter(f => f.category === 'choice'),
  },
  {
    label: 'Special',
    color: '#f59e0b',
    fields: FIELD_TYPES.filter(f => f.category === 'special'),
  },
  {
    label: 'Grid',
    color: '#10b981',
    fields: FIELD_TYPES.filter(f => f.category === 'grid'),
  },
  {
    label: 'Lookup',
    color: '#ec4899',
    fields: FIELD_TYPES.filter(f => f.category === 'lookup'),
  },
  {
    label: 'Layout',
    color: '#64748b',
    fields: FIELD_TYPES.filter(f => f.category === 'layout'),
  },
];

export default function Sidebar() {
  return (
    <aside
      className="w-64 flex flex-col h-full z-10 border-r shrink-0"
      style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--sidebar-border)' }}
    >
      {/* Sidebar header */}
      <div className="px-4 py-4 border-b shrink-0" style={{ borderColor: 'var(--sidebar-border)' }}>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Form Elements</h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Drag fields onto the canvas</p>
      </div>

      {/* Scrollable field type list with category groups */}
      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-4">
        {GROUPS.map((group) => (
          <div key={group.label}>
            {/* Category header */}
            <div className="flex items-center gap-2 px-1 mb-2">
              <div
                className="h-2 w-2 rounded-full"
                style={{ background: group.color }}
              />
              <span
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: 'var(--text-faint)' }}
              >
                {group.label}
              </span>
            </div>

            {/* Field buttons for this category */}
            {group.fields.map((field) => (
              <DraggableSidebarBtn
                key={field.type}
                type={field.type}
                label={field.label}
                icon={field.icon}
                category={field.category}
              />
            ))}
          </div>
        ))}
      </div>
    </aside>
  );
}