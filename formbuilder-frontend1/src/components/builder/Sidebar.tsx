// src/components/builder/Sidebar.tsx
'use client';

import { FieldType } from '@/types/schema';
import { Type, Hash, Calendar, ToggleLeft, AlignLeft, List, Disc, Layers, Clock, Star, BarChartHorizontal, Upload, Grid3X3, Table, Link2} from 'lucide-react';
import { DraggableSidebarBtn } from './DraggableSidebarBtn';

export const FIELD_TYPES = [
  { type: 'TEXT' as FieldType, label: 'Text Input', icon: Type },
  { type: 'NUMERIC' as FieldType, label: 'Number', icon: Hash },
  { type: 'DATE' as FieldType, label: 'Date Picker', icon: Calendar },
  { type: 'BOOLEAN' as FieldType, label: 'Checkbox', icon: ToggleLeft },
  { type: 'TEXTAREA' as FieldType, label: 'Long Text', icon: AlignLeft },

  { type: 'DROPDOWN' as FieldType, label: 'Dropdown', icon: List },
  { type: 'RADIO' as FieldType, label: 'Multiple Choice', icon: Disc },
  { type: 'CHECKBOX_GROUP' as FieldType, label: 'Checkboxes', icon: Layers },

  { type: 'TIME' as FieldType, label: 'Time', icon: Clock },
  { type: 'RATING' as FieldType, label: 'Star Rating', icon: Star },
  { type: 'SCALE' as FieldType, label: 'Linear Scale', icon: BarChartHorizontal },

  { type: 'FILE' as FieldType, label: 'File Upload', icon: Upload },

  { type: 'GRID_RADIO' as FieldType, label: 'Multiple Choice Grid', icon: Grid3X3 },
  { type: 'GRID_CHECK' as FieldType, label: 'Checkbox Grid', icon: Table },

  { type: 'LOOKUP' as FieldType, label: 'Linked Data', icon: Link2 },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-full z-10">
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-semibold text-gray-800">Form Elements</h2>
        <p className="text-xs text-gray-500 mt-1">Drag fields to the canvas</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        {FIELD_TYPES.map((field) => (
          <DraggableSidebarBtn key={field.type} {...field} />
        ))}
      </div>
    </aside>
  );
}