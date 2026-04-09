// src/components/builder/DraggableSidebarBtn.tsx
'use client';

/**
 * DraggableSidebarBtn — Draggable Field Type Button in the Builder Sidebar
 *
 * What it does:
 *   Renders a single field-type button in the sidebar (e.g. "Text Input", "Date Picker").
 *   Uses @dnd-kit/core's useDraggable hook to make the button a drag source.
 *   When dragged onto the Canvas (the droppable target), the builder adds a new field
 *   of the corresponding type.
 *
 * The icon background is color-coded by field category to help users identify
 * field groups at a glance.
 *
 * Also exports SidebarBtnOverlay:
 *   The "ghost" visual that appears under the user's cursor while dragging.
 *   Rendered by the DragOverlay in the builder page's DndContext.
 */

import { useDraggable } from '@dnd-kit/core';
import { FieldType } from '@/types/schema';
import { LucideIcon } from 'lucide-react';
import { CSS } from '@dnd-kit/utilities';

/** Color palette per field category */
const CATEGORY_COLORS: Record<string, { bg: string; icon: string }> = {
  basic: { bg: '#eff6ff', icon: '#3b82f6' },
  choice: { bg: '#f5f3ff', icon: '#8b5cf6' },
  special: { bg: '#fffbeb', icon: '#f59e0b' },
  grid: { bg: '#ecfdf5', icon: '#10b981' },
  lookup: { bg: '#fdf2f8', icon: '#ec4899' },
};

interface Props {
  type: FieldType;
  label: string;
  icon: LucideIcon;
  category?: string;
}

/**
 * The actual sidebar button. Color-coded by category.
 * While being dragged, it follows the cursor via the CSS transform from useDraggable.
 */
export function DraggableSidebarBtn({ type, label, icon: Icon, category = 'basic' }: Props) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `sidebar-btn-${type}`,
    data: {
      type,
      isSidebarBtn: true, // Distinguishes sidebar drags from canvas reorder drags
    },
  });

  const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.basic;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="flex items-center gap-3 px-3 py-2.5 mb-1.5 rounded-lg cursor-grab border transition-all duration-150 touch-none hover:shadow-sm active:scale-95"
      style={{
        transform: CSS.Translate.toString(transform),
        background: 'var(--card-bg)',
        borderColor: 'var(--border)',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = colors.icon;
        el.style.background = colors.bg;
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = 'var(--border)';
        el.style.background = 'var(--card-bg)';
      }}
    >
      <div
        className="p-1.5 rounded-md shrink-0 transition-colors"
        style={{ background: colors.bg }}
      >
        <Icon size={15} style={{ color: colors.icon }} />
      </div>
      <span className="text-xs font-medium leading-tight" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </span>
    </div>
  );
}

/**
 * Visual overlay shown under the cursor while the user is dragging a sidebar button.
 * Rendered by the DragOverlay in builder/page.tsx using the DndContext's active item.
 * Purely presentational — no drag/drop hooks.
 */
export function SidebarBtnOverlay({ label, icon: Icon, category = 'basic' }: Omit<Props, 'type'>) {
  const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.basic;
  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 shadow-xl w-56 cursor-grabbing"
      style={{
        background: 'var(--card-bg)',
        borderColor: colors.icon,
      }}
    >
      <div className="p-1.5 rounded-md" style={{ background: colors.bg }}>
        <Icon size={15} style={{ color: colors.icon }} />
      </div>
      <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</span>
    </div>
  );
}
