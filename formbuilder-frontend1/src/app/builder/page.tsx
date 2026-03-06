'use client';

/**
 * Builder Page — /builder
 *
 * The main drag-and-drop form creation/editing interface. Consists of:
 *   - Left: Sidebar (field type palette — drag sources)
 *   - Centre: Canvas (droppable field canvas) OR LogicPanel (when Logic tab is active)
 *   - Right: PropertiesPanel (field properties editor — only in EDITOR tab)
 */

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  useSensor,
  useSensors,
  PointerSensor,
  closestCorners
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { useFormStore } from '@/store/useFormStore';
import { FieldType } from '@/types/schema';
import { saveForm, deleteForm } from '@/services/api';
import { toast } from 'sonner';
import LogicPanel from '@/components/builder/LogicPanel';
import { ArrowLeft, Archive, GitBranch, Layout, Link2, Save } from 'lucide-react';

import Sidebar, { FIELD_TYPES } from '@/components/builder/Sidebar';
import { SidebarBtnOverlay } from '@/components/builder/DraggableSidebarBtn';
import Canvas from '@/components/builder/Canvas';
import PropertiesPanel from '@/components/builder/PropertiesPanel';
import { SortableField } from '@/components/builder/SortableField';
import ThemeToggle from '@/components/ThemeToggle';
import Link from 'next/link';


function BuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editFormId = searchParams.get('id');

  const {
    schema, addField, reorderFields, setFormId, setTitle, setDescription,
    setFields, setRules, resetForm, setAllowEditResponse
  } = useFormStore();

  const [activeSidebarItem, setActiveSidebarItem] = useState<FieldType | null>(null);
  const [activeCanvasItemId, setActiveCanvasItemId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'EDITOR' | 'LOGIC'>('EDITOR');

  useEffect(() => {
    if (!editFormId) {
      resetForm();
      return;
    }

    fetch(`http://localhost:8080/api/forms/${editFormId}`)
      .then(res => res.json())
      .then(data => {
        setFormId(data.id);
        setTitle(data.title);
        setDescription(data.description || '');
        setAllowEditResponse(data.allowEditResponse || false);

        useFormStore.setState((state) => ({
          schema: { ...state.schema, publicShareToken: data.publicShareToken }
        }));

        let parsedRules = [];
        if (data.versions[0].rules) {
          if (typeof data.versions[0].rules === 'string') {
            try { parsedRules = JSON.parse(data.versions[0].rules); }
            catch (e) { console.error("Failed to parse rules from DB", e); }
          } else {
            parsedRules = data.versions[0].rules;
          }
        }
        setRules(parsedRules);

        const mappedFields = data.versions[0].fields.map((f: any) => {
          let parsedOptions: any = [];
          if (f.options) {
            if (typeof f.options === 'string') {
              try { parsedOptions = JSON.parse(f.options); }
              catch (e) { parsedOptions = f.options.split(',').map((s: string) => s.trim()); }
            } else {
              parsedOptions = f.options;
            }
          }
          return {
            id: f.id.toString(),
            type: f.fieldType,
            label: f.fieldLabel,
            columnName: f.columnName,
            defaultValue: f.defaultValue,
            options: parsedOptions,
            validation: { required: f.isMandatory, ...f.validationRules }
          };
        });
        setFields(mappedFields);
      })
      .catch(err => {
        console.error("Failed to load form:", err);
        toast.error("Failed to load form data");
      });
  }, [editFormId, setFormId, setTitle, setDescription, setFields]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleSave = async (status: 'DRAFT' | 'PUBLISHED') => {
    if (schema.fields.length === 0) {
      toast.error("Cannot save an empty form");
      return;
    }
    setIsSaving(true);
    try {
      const payload = { ...schema, status };
      await saveForm(payload);
      toast.success(`Form ${status === 'DRAFT' ? 'saved as draft' : 'published successfully'}!`);
      router.push('/');
    } catch (error) {
      console.error(error);
      toast.error("Failed to save form");
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchive = () => {
    if (!editFormId) return;
    toast('Archive this form?', {
      description: 'You will be redirected to the dashboard.',
      action: {
        label: 'Archive',
        onClick: async () => {
          try {
            await deleteForm(Number(editFormId));
            toast.success("Form archived");
            router.push('/');
          } catch (err) {
            toast.error("Failed to archive form");
          }
        }
      },
      cancel: { label: 'Cancel', onClick: () => { } }
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeData = active.data.current;
    if (activeData?.isSidebarBtn) {
      setActiveSidebarItem(activeData.type);
      setActiveCanvasItemId(null);
      return;
    }
    setActiveSidebarItem(null);
    setActiveCanvasItemId(active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveSidebarItem(null);
    setActiveCanvasItemId(null);
    if (!over) return;
    const activeData = active.data.current;
    if (activeData?.isSidebarBtn) {
      if (over.id === 'canvas-droppable' || schema.fields.some(f => f.id === over.id)) {
        addField(activeData.type);
      }
      return;
    }
    if (active.id !== over.id) {
      const oldIndex = schema.fields.findIndex((f) => f.id === active.id);
      const newIndex = schema.fields.findIndex((f) => f.id === over.id);
      reorderFields(arrayMove(schema.fields, oldIndex, newIndex));
    }
  };

  const renderOverlay = () => {
    if (activeSidebarItem) {
      const tool = FIELD_TYPES.find(t => t.type === activeSidebarItem);
      return tool ? <SidebarBtnOverlay label={tool.label} icon={tool.icon} category={tool.category} /> : null;
    }
    if (activeCanvasItemId) {
      const field = schema.fields.find(f => f.id === activeCanvasItemId);
      return field ? (
        <div className="opacity-80 rotate-1 pointer-events-none">
          <SortableField field={field} onRemove={() => { }} onSelect={() => { }} isSelected={false} />
        </div>
      ) : null;
    }
    return null;
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div
        className="flex h-screen w-full overflow-hidden"
        style={{ background: 'var(--canvas-bg)' }}
      >
        {/* 1. Sidebar */}
        {activeTab === 'EDITOR' && <Sidebar />}

        <main className="flex-1 flex flex-col min-w-0 h-full">
          {/* ── Top Header Bar ── */}
          <header
            className="h-14 border-b flex items-center justify-between px-5 shrink-0 z-10"
            style={{ background: 'var(--header-bg)', borderColor: 'var(--header-border)' }}
          >
            {/* Left: Back link + form title */}
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="p-1.5 rounded-lg transition-all"
                style={{ color: 'var(--text-muted)' }}
                title="Back to Dashboard"
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-muted)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
              >
                <ArrowLeft size={18} />
              </Link>
              <div className="w-px h-5" style={{ background: 'var(--border)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {editFormId ? 'Edit Form' : 'Create Form'}
              </span>
            </div>

            {/* Centre: Tab toggle */}
            <div
              className="flex rounded-lg p-1"
              style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)' }}
            >
              <button
                onClick={() => setActiveTab('EDITOR')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all"
                style={
                  activeTab === 'EDITOR'
                    ? { background: 'var(--card-bg)', color: 'var(--text-primary)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
                    : { color: 'var(--text-muted)' }
                }
              >
                <Layout size={13} /> Form Editor
              </button>
              <button
                onClick={() => setActiveTab('LOGIC')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all"
                style={
                  activeTab === 'LOGIC'
                    ? { background: 'var(--card-bg)', color: 'var(--text-primary)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
                    : { color: 'var(--text-muted)' }
                }
              >
                <GitBranch size={13} /> Logic Rules
              </button>
            </div>

            {/* Right: Action buttons */}
            <div className="flex items-center gap-2">
              <ThemeToggle />

              {editFormId && (
                <button
                  onClick={handleArchive}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{ color: '#b91c1c', background: '#fee2e2' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#fecaca'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#fee2e2'}
                >
                  <Archive size={13} /> Archive
                </button>
              )}

              <button
                onClick={() => handleSave('DRAFT')}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border"
                style={{
                  background: 'var(--bg-muted)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-secondary)'
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-subtle)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-muted)'}
              >
                <Save size={13} /> Save Draft
              </button>

              {schema.publicShareToken && (
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/f/${schema.publicShareToken}`;
                    navigator.clipboard.writeText(url);
                    toast.success("Share link copied to clipboard!");
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{ color: 'var(--accent)', background: 'var(--accent-subtle)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--accent-muted)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--accent-subtle)'}
                >
                  <Link2 size={13} /> Share
                </button>
              )}

              <button
                onClick={() => handleSave('PUBLISHED')}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white gradient-accent shadow-sm transition-all hover:shadow-md disabled:opacity-60"
              >
                {isSaving ? 'Saving...' : 'Publish →'}
              </button>
            </div>
          </header>

          {/* 2. Main content */}
          {activeTab === 'EDITOR' ? <Canvas /> : <LogicPanel />}
        </main>

        {/* 3. Right panel */}
        {activeTab === 'EDITOR' && (
          <>
            <PropertiesPanel />
            <DragOverlay>{renderOverlay()}</DragOverlay>
          </>
        )}
      </div>
    </DndContext>
  );
}

export default function BuilderPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center" style={{ background: 'var(--bg-base)', color: 'var(--text-muted)' }}>
        Loading builder...
      </div>
    }>
      <BuilderContent />
    </Suspense>
  );
}