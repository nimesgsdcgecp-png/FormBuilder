'use client';

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

// Components
import Sidebar, { FIELD_TYPES } from '@/components/builder/Sidebar';
import { SidebarBtnOverlay } from '@/components/builder/DraggableSidebarBtn';
import Canvas from '@/components/builder/Canvas';
import PropertiesPanel from '@/components/builder/PropertiesPanel';
import { SortableField } from '@/components/builder/SortableField';



function BuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editFormId = searchParams.get('id');


  const {
    schema,
    addField,
    reorderFields,
    setFormId,
    setTitle,
    setDescription,
    setFields,
    setRules,
    resetForm
  } = useFormStore();

  const [activeSidebarItem, setActiveSidebarItem] = useState<FieldType | null>(null);
  const [activeCanvasItemId, setActiveCanvasItemId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'EDITOR' | 'LOGIC'>('EDITOR');

  // --- LOAD EXISTING FORM ---
  useEffect(() => {
    if (!editFormId) {
      resetForm(); // <--- Clear the store for a new form!
      return;
    }

    fetch(`http://localhost:8080/api/forms/${editFormId}`)
      .then(res => res.json())
      .then(data => {
        setFormId(data.id);
        setTitle(data.title);
        setDescription(data.description || '');

        // Map Backend Fields to Frontend Store
        const mappedFields = data.versions[0].fields.map((f: any) => {
          // 1. Parse Options JSON String -> Array
          let parsedOptions: string[] = [];
          if (f.options) {
            try {
              parsedOptions = JSON.parse(f.options);
            } catch (e) {
              console.error("Failed to parse options for field", f.id, e);
            }
          }
          
          let parsedRules = [];
          if (data.versions[0].rules) {
            try {
              // The database might send it as a JSON string, so we safely parse it
              parsedRules = typeof data.versions[0].rules === 'string' 
                ? JSON.parse(data.versions[0].rules) 
                : data.versions[0].rules;
            } catch (e) {
              console.error("Failed to parse rules from DB", e);
            }
          }
          setRules(parsedRules);

          return {
            id: f.id.toString(),
            type: f.fieldType,
            label: f.fieldLabel,
            columnName: f.columnName,
            defaultValue: f.defaultValue,
            options: parsedOptions, // <--- Set the parsed array
            validation: {
              required: f.isMandatory,
              ...f.validationRules
            }
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

  // --- NEW SAVE LOGIC ---
  const handleSave = async (status: 'DRAFT' | 'PUBLISHED') => {
    if (schema.fields.length === 0) {
      toast.error("Cannot save empty form");
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

  // --- NEW ARCHIVE LOGIC ---
  // --- NEW ARCHIVE LOGIC WITH SONNER ---
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
      cancel: {
        label: 'Cancel',
        onClick: () => { }
      }
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
      return tool ? <SidebarBtnOverlay label={tool.label} icon={tool.icon} /> : null;
    }
    if (activeCanvasItemId) {
      const field = schema.fields.find(f => f.id === activeCanvasItemId);
      return field ? (
        <div className="opacity-80 rotate-2 pointer-events-none">
          <SortableField field={field} onRemove={() => { }} onSelect={() => { }} isSelected={false} />
        </div>
      ) : null;
    }
    return null;
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex h-screen w-full bg-gray-100 overflow-hidden">
        
        {/* 1. Conditionally render Sidebar */}
        {activeTab === 'EDITOR' && <Sidebar />}
        
        <main className="flex-1 flex flex-col min-w-0 h-full">
          {/* HEADER (Always Visible) */}
          <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 z-10">
            <h1 className="font-bold text-gray-800">
              {editFormId ? 'Edit Form' : 'Create Form'}
            </h1>
            
            {/* TOGGLE */}
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('EDITOR')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'EDITOR' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Form Editor
              </button>
              <button
                onClick={() => setActiveTab('LOGIC')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'LOGIC' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Logic Rules
              </button>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex gap-3">
              {editFormId && (
                <button
                  onClick={handleArchive}
                  className="px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 text-sm font-medium rounded shadow-sm transition-colors"
                >
                  Archive
                </button>
              )}
              <button
                onClick={() => handleSave('DRAFT')}
                disabled={isSaving}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 text-sm font-medium rounded shadow-sm transition-colors"
              >
                Save Draft
              </button>
              <button
                onClick={() => handleSave('PUBLISHED')}
                disabled={isSaving}
                className={`px-4 py-2 text-white text-sm font-medium rounded shadow-sm transition-colors ${isSaving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {isSaving ? 'Saving...' : 'Publish'}
              </button>
            </div>
          </header>

          {/* 2. Conditionally render Canvas or LogicPanel */}
          {activeTab === 'EDITOR' ? (
            <Canvas />
          ) : (
            <LogicPanel />
          )}

        </main>
        
        {/* 3. Conditionally render Properties and Drag Overlay */}
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
    <Suspense fallback={<div>Loading builder...</div>}>
      <BuilderContent />
    </Suspense>
  );
}