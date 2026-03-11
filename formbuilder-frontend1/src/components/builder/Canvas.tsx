import React from 'react';
import { useDroppable, useDndContext } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useFormStore } from '@/store/useFormStore';
import { SortableField } from './SortableField';
import { MousePointer2, Plus } from 'lucide-react';

// Maps font names to CSS font-family values
const FONT_MAP: Record<string, string> = {
  'Inter': 'Inter, sans-serif',
  'Geist Sans': 'var(--font-geist-sans), sans-serif',
  'Geist Mono': 'var(--font-geist-mono), monospace',
  'System UI': 'system-ui, sans-serif'
};

export default function Canvas() {
  const { schema, removeField, selectField, selectedFieldId, setTitle, setDescription, setAllowEditResponse } = useFormStore();
  const { fields } = schema;

  const { setNodeRef, isOver } = useDroppable({ id: 'canvas-droppable' });
  const { setNodeRef: setBottomRef, isOver: isOverBottom } = useDroppable({ id: 'canvas-drop-bottom' });
  const { active, over } = useDndContext();

  const isDraggingNewField = active?.data.current?.isSidebarBtn;
  const overId = over?.id;
  const overIndex = fields.findIndex(f => f.id === overId);

  return (
    <div
      className="flex-1 p-8 h-full overflow-y-auto transition-colors"
      style={{ background: 'var(--canvas-bg)' }}
      onClick={() => {
        selectField(null);
        useFormStore.getState().setThemePanelOpen(false);
      }}
    >
      <div
        className="max-w-3xl mx-auto pb-20 transition-all font-sans"
        style={{ fontFamily: FONT_MAP[schema.themeFont || 'Inter'] || FONT_MAP['Inter'] }}
      >
        {/* White card — the actual droppable surface */}
        <div
          ref={setNodeRef}
          className="rounded-xl min-h-[600px] transition-all duration-200 relative"
          style={{
            background: 'var(--card-bg)',
            border: isOver || isOverBottom
              ? '2px dashed var(--accent)'
              : '1px solid var(--card-border)',
            boxShadow: isOver || isOverBottom
              ? '0 0 0 4px var(--accent-muted)'
              : 'var(--card-shadow)',
            padding: '2rem',
          }}
        >
          {/* Theme color header accent */}
          <div
            className="h-2 w-full rounded-t-xl absolute top-0 left-0"
            style={{ backgroundColor: schema.themeColor || 'var(--accent)' }}
          />

          {/* Form Header */}
          <div
            className="mb-8 pb-6 border-b mt-2"
            style={{ borderColor: 'var(--border)' }}
          >
            <input
              type="text"
              value={schema.title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-3xl font-bold w-full border-none focus:ring-0 px-0 bg-transparent placeholder-[var(--text-faint)] outline-none"
              style={{ color: 'var(--text-primary)' }}
              placeholder="Enter Form Title..."
              onClick={(e) => e.stopPropagation()}
            />

            <textarea
              value={schema.description || ''}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Form description (optional)"
              className="w-full border-none focus:ring-0 px-0 mt-2 resize-none bg-transparent outline-none text-sm"
              style={{ color: 'var(--text-muted)' }}
              rows={2}
              onClick={(e) => e.stopPropagation()}
            />

            {/* Allow-edit toggle */}
            <div
              className="mt-4 flex items-center gap-3 p-3 rounded-lg border"
              style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)' }}
            >
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={schema.allowEditResponse || false}
                  onChange={(e) => {
                    e.stopPropagation();
                    setAllowEditResponse(e.target.checked);
                  }}
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500" />
                <span className="ml-3 text-xs font-medium select-none" style={{ color: 'var(--text-secondary)' }}>
                  Allow respondents to edit their submission
                </span>
              </label>
            </div>
          </div>

          {/* Field list */}
          <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3 min-h-[200px]">
              {/* Empty state */}
              {fields.length === 0 && !isOver && !isOverBottom && (
                <div
                  className="flex flex-col items-center justify-center h-56 rounded-xl border-2 border-dashed gap-3"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-faint)', background: 'var(--bg-muted)' }}
                >
                  <MousePointer2 size={32} className="opacity-40" />
                  <div className="text-center">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Canvas is empty</p>
                    <p className="text-xs mt-0.5">Drag fields from the sidebar to start building</p>
                  </div>
                </div>
              )}

              {fields.map((field, index) => (
                <React.Fragment key={field.id}>
                  {/* Drop Placeholder (Visual Preview) */}
                  {isDraggingNewField && overIndex === index && (
                    <div
                      className="h-[72px] rounded-xl border-2 border-dashed flex items-center justify-center animate-in fade-in zoom-in duration-200"
                      style={{ borderColor: 'var(--accent)', background: 'var(--accent-subtle)' }}
                    >
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
                        <Plus size={14} /> Insert {active.data.current?.type} here
                      </div>
                    </div>
                  )}
                  <SortableField
                    field={field}
                    onRemove={removeField}
                    onSelect={selectField}
                    isSelected={selectedFieldId === field.id}
                  />
                </React.Fragment>
              ))}

              {/* Explicit Drop-at-bottom Zone & Placeholder */}
              <div
                ref={setBottomRef}
                className={`group relative h-20 rounded-xl border-2 border-dashed transition-all flex items-center justify-center ${fields.length > 0 ? 'mt-6' : ''}`}
                style={{
                  borderColor: isOverBottom || (isDraggingNewField && overId === 'canvas-droppable') ? 'var(--accent)' : 'var(--border)',
                  background: isOverBottom || (isDraggingNewField && overId === 'canvas-droppable') ? 'var(--accent-subtle)' : 'transparent',
                  opacity: isDraggingNewField || fields.length === 0 ? 1 : 0.4
                }}
              >
                {(isOverBottom || (isDraggingNewField && overId === 'canvas-droppable')) ? (
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider animate-pulse" style={{ color: 'var(--accent)' }}>
                    <Plus size={14} /> Drop to append {isDraggingNewField ? active.data.current?.type : 'field'}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                    <Plus size={20} style={{ color: 'var(--text-faint)' }} />
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>Add to end</span>
                  </div>
                )}
              </div>
            </div>
          </SortableContext>
        </div>
      </div>
    </div>
  );
}
