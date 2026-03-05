// src/components/builder/SortableField.tsx
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import { FormField } from '@/types/schema';

interface SortableFieldProps {
  field: FormField;
  onRemove: (id: string) => void;
  onSelect: (id: string) => void;
  isSelected: boolean;
}

export function SortableField({ field, onRemove, onSelect, isSelected }: SortableFieldProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative flex items-center gap-4 p-4 mb-2 bg-white border rounded shadow-sm group cursor-pointer
        ${isSelected ? 'border-blue-500 ring-1 ring-blue-500 z-10' : 'border-gray-200 hover:border-blue-300'}`}
      onClick={(e) => {
        e.stopPropagation(); // <--- CRITICAL FIX: Stops the click from reaching the Canvas background
        onSelect(field.id);
      }}
    >
      {/* Drag Handle */}
      <div 
        {...attributes} 
        {...listeners} 
        className="cursor-grab text-gray-400 hover:text-gray-600 focus:outline-none"
        onClick={(e) => e.stopPropagation()} // Prevent drag handle click from selecting
      >
        <GripVertical size={20} />
      </div>

      {/* Field Content Preview */}
      <div className="flex-1 pointer-events-none"> {/* Disable pointer events here so click passes to parent div */}
        <label className="block text-sm font-medium text-gray-700">
          {field.label} {field.validation.required && <span className="text-red-500">*</span>}
        </label>
        <div className="mt-1 p-2 bg-gray-50 border border-gray-200 rounded text-gray-400 text-sm">
          {field.type} Input Preview
        </div>
      </div>

      {/* Delete Button */}
      <button 
        onClick={(e) => {
          e.stopPropagation(); // Stop delete click from selecting
          onRemove(field.id);
        }}
        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
}