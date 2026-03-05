// src/components/builder/Canvas.tsx
'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useFormStore } from '@/store/useFormStore';
import { SortableField } from './SortableField';

export default function Canvas() {
  // 1. Destructure setDescription
  const { schema, removeField, selectField, selectedFieldId, setTitle, setDescription } = useFormStore();
  const { fields } = schema;

  const { setNodeRef, isOver } = useDroppable({
    id: 'canvas-droppable',
  });

  return (
    <div 
      className="flex-1 bg-gray-50 p-8 h-full overflow-y-auto transition-colors"
      onClick={(e) => {
         // Only deselect if the user clicked strictly on the background gray area
         // (SortableField stops propagation, so this won't fire when clicking a field)
         selectField(null);
      }}
    >
      <div className="max-w-3xl mx-auto pb-20">
        <div 
          ref={setNodeRef}
          className={`
            bg-white rounded-lg shadow-sm border p-6 min-h-150 transition-colors
            ${isOver ? 'border-blue-500 bg-blue-50/30 ring-2 ring-blue-200' : 'border-gray-200'}
          `}
          // Prevent clicks inside the white card from deselecting (optional, depends on preference)
          // For now, let's allow clicking empty white space to deselect too
        >
          {/* Header Section */}
          <div className="mb-8 border-b border-gray-100 pb-4">
            <input
              type="text"
              value={schema.title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-3xl font-bold text-gray-800 w-full border-none focus:ring-0 px-0 placeholder-gray-300 bg-transparent"
              placeholder="Enter Form Title..."
              onClick={(e) => e.stopPropagation()} // Prevent input click from deselecting
            />
            
            {/* 2. Bind the Description Textarea */}
            <textarea
               value={schema.description || ''}
               onChange={(e) => setDescription(e.target.value)} // <--- FIXED
               placeholder="Form description (optional)"
               className="text-gray-500 w-full border-none focus:ring-0 px-0 mt-1 resize-none bg-transparent"
               rows={2}
               onClick={(e) => e.stopPropagation()} // Prevent textarea click from deselecting
            />
          </div>

          <SortableContext 
            items={fields.map(f => f.id)} 
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3 min-h-50">
              {fields.length === 0 && !isOver && (
                <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 bg-gray-50/50">
                  <p className="text-lg font-medium">Your canvas is empty</p>
                  <p className="text-sm">Drag fields from the sidebar to start</p>
                </div>
              )}
              
              {fields.map((field) => (
                <SortableField
                  key={field.id}
                  field={field}
                  onRemove={removeField}
                  onSelect={selectField}
                  isSelected={selectedFieldId === field.id}
                />
              ))}
            </div>
          </SortableContext>
        </div>
      </div>
    </div>
  );
}