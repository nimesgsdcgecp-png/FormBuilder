// src/components/builder/DraggableSidebarBtn.tsx
'use client';

import { useDraggable } from '@dnd-kit/core';
import { FieldType } from '@/types/schema';
import { LucideIcon } from 'lucide-react';
import { CSS } from '@dnd-kit/utilities';

interface Props {
  type: FieldType;
  label: string;
  icon: LucideIcon;
}

export function DraggableSidebarBtn({ type, label, icon: Icon }: Props) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `sidebar-btn-${type}`,
    data: {
      type,
      isSidebarBtn: true, // Marker to distinguish from canvas fields
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="flex items-center gap-3 p-3 mb-2 bg-white border border-gray-200 rounded-lg shadow-sm cursor-grab hover:border-blue-400 hover:shadow-md transition-all touch-none"
    >
      <div className="p-2 bg-blue-50 text-blue-600 rounded">
        <Icon size={18} />
      </div>
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </div>
  );
}

// Visual overlay when dragging (The "Ghost" image)
export function SidebarBtnOverlay({ label, icon: Icon }: Omit<Props, 'type'>) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white border-2 border-blue-500 rounded-lg shadow-xl opacity-90 w-64 cursor-grabbing">
      <div className="p-2 bg-blue-50 text-blue-600 rounded">
        <Icon size={18} />
      </div>
      <span className="text-sm font-medium text-gray-900">{label}</span>
    </div>
  );
}