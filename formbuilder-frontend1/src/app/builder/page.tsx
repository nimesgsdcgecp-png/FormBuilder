'use client';

/**
 * Builder Page — /builder
 *
 * The main drag-and-drop form creation/editing interface. Consists of:
 *   - Left: Sidebar (field type palette — drag sources)
 *   - Centre: Canvas (droppable field canvas) OR LogicPanel (when Logic tab is active)
 *   - Right: PropertiesPanel (field properties editor — only in EDITOR tab)
 */

import { useEffect, useState, useRef, Suspense } from 'react';
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
import { saveForm, updateForm, deleteForm } from '@/services/api';
import { toast } from 'sonner';
import LogicPanel from '@/components/builder/LogicPanel';
import CustomValidationsPanel, { ValidationRule } from '@/components/builder/CustomValidationsPanel';
import Header from '@/components/Header';
import { usePermissions } from '@/hooks/usePermissions';
import { ArrowLeft, Archive, GitBranch, Layout, Link2, Save, Palette, FileText, User, ChevronRight, Check, Search, ShieldAlert, Plus, Settings2 } from 'lucide-react';

import Sidebar, { FIELD_TYPES } from '@/components/builder/Sidebar';
import { SidebarBtnOverlay } from '@/components/builder/DraggableSidebarBtn';
import Canvas from '@/components/builder/Canvas';
import PropertiesPanel from '@/components/builder/PropertiesPanel';
import { SortableField } from '@/components/builder/SortableField';
import ThemeToggle from '@/components/ThemeToggle';
import Link from 'next/link';
import { Eye, ExternalLink } from 'lucide-react';
import VersionsPanel from '@/components/builder/VersionsPanel';

function BuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editFormId = searchParams.get('id');

  const {
    schema, addField, insertField, reorderFields, setFormId, setTitle, setDescription,
    setFields, setRules, resetForm, setAllowEditResponse, isThemePanelOpen, setThemePanelOpen,
    setThemeColor, setThemeFont, setStatus
  } = useFormStore();

  const [activeSidebarItem, setActiveSidebarItem] = useState<FieldType | null>(null);
  const [activeCanvasItemId, setActiveCanvasItemId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'EDITOR' | 'LOGIC' | 'VALIDATIONS' | 'VERSIONS'>('EDITOR');
  const [formValidations, setFormValidations] = useState<ValidationRule[]>([]);
  const [username, setUsername] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<'PALETTE' | 'CANVAS' | 'PROPERTIES'>('CANVAS');
  const [initialState, setInitialState] = useState<string>('');
  const isDirty = initialState !== JSON.stringify({ schema, formValidations });
  const profileRef = useRef<HTMLDivElement>(null);
  const { hasPermission, assignments } = usePermissions();
  const isAdminOrBuilder = assignments.some((a: any) => 
    ['ADMIN', 'ROLE_ADMINISTRATOR', 'BUILDER', 'ADMINISTRATOR'].includes(a.role.name)
  );

  // Workflow Modal State
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false);
  const [workflowType, setWorkflowType] = useState<'NORMAL' | 'LEVEL_1' | 'LEVEL_2'>('NORMAL');
  const [availableBuilders, setAvailableBuilders] = useState<any[]>([]);
  const [availableCustomApprovers, setAvailableCustomApprovers] = useState<any[]>([]);
  const [selectedBuilderId, setSelectedBuilderId] = useState<string>('');
  const [selectedApproverIds, setSelectedApproverIds] = useState<string[]>([]);

  useEffect(() => {
    // 1. Check Auth first. If we are just creating a new form, we still need to be logged in.
    const checkAuth = async () => {
      try {
        const response = await fetch('http://localhost:8080/api/v1/auth/me', {
          credentials: 'include'
        });
        if (!response.ok) {
          router.push('/login');
          return;
        }
        const data = await response.json();
        setUsername(data.username);
      } catch (err) {
        router.push('/login');
        return;
      }
    };
    checkAuth();

    // Close profile dropdown on click outside
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    if (!editFormId) {
      resetForm();
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }

    fetch(`http://localhost:8080/api/v1/forms/${editFormId}`, { credentials: 'include' })
      .then(res => {
        if (res.status === 401) {
          router.push('/login');
          throw new Error('Unauthorized');
        }
        return res.json();
      })
      .then(data => {
        setFormId(data.id);
        setTitle(data.title);
        useFormStore.setState((state) => ({
          schema: { ...state.schema, code: data.code || '', codeLocked: data.codeLocked || false }
        }));
        setDescription(data.description || '');
        setAllowEditResponse(data.allowEditResponse || false);
        setStatus(data.status);

        useFormStore.setState((state) => ({
          schema: { ...state.schema, publicShareToken: data.publicShareToken, status: data.status }
        }));

        if (data.themeColor) setThemeColor(data.themeColor);
        if (data.themeFont) setThemeFont(data.themeFont);

        // Always pick the latest version by versionNumber for editing, 
        // preferring the active one if multiple exist (though usually only one is active).
        const versions = [...data.versions].sort((a, b) => (b.versionNumber || 0) - (a.versionNumber || 0));
        const activeVersion = versions.find((v: any) => v.isActive) || versions[0];

        // Load AST custom validations from the active version
        if (activeVersion.formValidations && Array.isArray(activeVersion.formValidations)) {
          setFormValidations(activeVersion.formValidations.map((fv: any) => ({
            id: fv.id || crypto.randomUUID(),
            scope: fv.scope || 'FORM',
            fieldKey: fv.fieldKey || '',
            expression: fv.expression || '',
            errorMessage: fv.errorMessage || '',
            executionOrder: fv.executionOrder || 0,
          })));
        }

        let parsedRules = [];
        if (activeVersion.rules) {
          let raw = activeVersion.rules;
          if (typeof raw === 'string') {
            try { raw = JSON.parse(raw); } catch (e) { }
          }
          // If it's our new wrapper structure { theme, logic }
          if (raw && typeof raw === 'object' && !Array.isArray(raw) && (raw as any).logic) {
            parsedRules = (raw as any).logic;
          } else {
            parsedRules = Array.isArray(raw) ? raw : [];
          }
        }
        setRules(parsedRules);

        const mapFieldsRecursive = (fields: any[]): any[] => {
          return fields.map((f: any) => {
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
              validation: { required: f.isMandatory, ...f.validationRules },
              placeholder: f.placeholder || '',
              calculationFormula: f.calculationFormula,
              helpText: f.helpText,
              isHidden: f.isHidden,
              isReadOnly: f.isReadOnly,
              isDisabled: f.isDisabled,
              isMultiSelect: f.isMultiSelect,
              children: f.children ? mapFieldsRecursive(f.children) : (f.fieldType === 'SECTION_HEADER' ? [] : undefined)
            };
          });
        };

        const mappedFields = mapFieldsRecursive(activeVersion.fields);
        setFields(mappedFields);
        
        // Capture initial state for dirty check after all setters have run
        setTimeout(() => {
          setInitialState(JSON.stringify({ 
            schema: { ...useFormStore.getState().schema, fields: mappedFields, rules: parsedRules }, 
            formValidations: data.versions?.find((v: any) => v.isActive)?.formValidations || [] 
          }));
        }, 100);
      })
      .catch(err => {
        console.error("Failed to load form:", err);
        toast.error("Failed to load form data");
      });

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [editFormId, setFormId, setTitle, setDescription, setFields]);

  useEffect(() => {
    // Fetch users for workflow selection
    const fetchUsers = async () => {
      try {
        const url = editFormId 
          ? `http://localhost:8080/api/v1/workflows/available-authorities?formId=${editFormId}`
          : 'http://localhost:8080/api/v1/workflows/available-authorities';
          
        const res = await fetch(url, { credentials: 'include' });
        if (res.ok) {
          const users = await res.json();
          // Filter Builders (for final step) - check if any role starts with "BUILDER"
          setAvailableBuilders(users.filter((u: any) => 
            u.roles.some((r: string) => r.startsWith('BUILDER'))
          ));
          // Filter Custom Roles (for intermediate steps)
          // A user is a custom approver if they have AT LEAST ONE role that is NOT a static role
          const staticRoles = ['ADMIN', 'ROLE_ADMINISTRATOR', 'BUILDER', 'USER'];
          setAvailableCustomApprovers(users.filter((u: any) => 
            u.roles.some((r: string) => !staticRoles.some(s => r.startsWith(s)))
          ));
        }
      } catch (err) { console.error("Failed to load users for workflow", err); }
    };
    fetchUsers();
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleSave = async (status: 'DRAFT' | 'PUBLISHED') => {
    if (schema.fields.length === 0) {
      toast.error("Cannot save an empty form");
      return;
    }
    
    
    // Only force workflow modal if:
    // 1. Trying to PUBLISH and NOT an Admin/Builder
    // 2. OR if user explicitly clicks "Request Approval" (which we will handle via its own button)
    if (status === 'PUBLISHED' && !isAdminOrBuilder) {
        setIsWorkflowModalOpen(true);
        return;
    }

    setIsSaving(true);
    try {
      // Cast status to any to bypass the union type restriction for the DTO
      const payload: any = { 
        ...schema, 
        status: status,
        formValidations: formValidations.map(v => ({
          fieldKey: v.fieldKey,
          scope: v.scope,
          expression: v.expression,
          errorMessage: v.errorMessage,
          executionOrder: v.executionOrder
        }))
      };
      
      let savedForm;
      if (editFormId) {
        savedForm = await updateForm(Number(editFormId), payload);
      } else {
        savedForm = await saveForm(payload);
        // After initial save, set the editFormId so subsequent saves update THIS form
        if (savedForm && savedForm.id) {
            setFormId(savedForm.id);
        }
      }

      if (savedForm && savedForm.status) {
        setStatus(savedForm.status);
      }

      // Sync custom validations from the response's active version
      const returnedVersion = savedForm.versions?.find((v: any) => v.isActive) || 
                             [...savedForm.versions || []].sort((a, b) => (b.versionNumber || 0) - (a.versionNumber || 0))[0];
      
      if (returnedVersion && Array.isArray(returnedVersion.formValidations)) {
        setFormValidations(returnedVersion.formValidations.map((fv: any) => ({
          id: fv.id || crypto.randomUUID(),
          scope: fv.scope || 'FORM',
          fieldKey: fv.fieldKey || '',
          expression: fv.expression || '',
          errorMessage: fv.errorMessage || '',
          executionOrder: fv.executionOrder || 0,
        })));
      }

      toast.success(`Form ${status === 'PUBLISHED' ? 'published successfully!' : 'saved as draft!'}`);
      
      // Update initial state after successful save
      setInitialState(JSON.stringify({ schema: payload, formValidations }));
      
      // Don't push to '/' yet, allow user to keep editing or "Request Approval"
      // router.push('/'); 
    } catch (error) {
      console.error(error);
      toast.error("Failed to save form");
    } finally {
      setIsSaving(false);
    }
  };

  const handleInitiateWorkflow = async () => {
    if (!selectedBuilderId) return toast.error("Please select a target Builder");
    if (workflowType === 'LEVEL_1' && selectedApproverIds.length < 1) return toast.error("Select an intermediate authority");
    if (workflowType === 'LEVEL_2' && selectedApproverIds.length < 2) return toast.error("Select 2 intermediate authorities");

    setIsSaving(true);
    try {
      // 1. Save form first if it's new
      const currentPayload: any = { ...schema, status: 'DRAFT' };
      const savedForm = await saveForm(currentPayload);
      const formId = savedForm.id;

      // 2. Initiate Workflow
      const res = await fetch('http://localhost:8080/api/v1/workflows/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          formId,
          workflowType,
          targetBuilderId: parseInt(selectedBuilderId),
          intermediateAuthorityIds: selectedApproverIds.map(id => parseInt(id))
        })
      });

      if (res.ok) {
        const result = await res.json();
        console.log("Workflow initiated successfully:", result);
        toast.success("Workflow initiated successfully!");
        
        // Update local status to reflect that it's now pending approval
        // The backend transition for a new workflow initiation sets it to PENDING_PUBLISH or similar
        // Let's refetch or manually set a temporary status. 
        // Actually, the router push will take them to dashboard where it's fresh.
        router.push('/');
      } else {
        const errorText = await res.text();
        console.error("Workflow initiation failed:", res.status, errorText);
        toast.error(`Failed to initiate workflow: ${res.status}`);
      }
    } catch (err) {
      toast.error("An error occurred");
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

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:8080/api/v1/auth/logout', { method: 'POST', credentials: 'include' });
      router.push('/login');
      toast.success('Logged out successfully');
    } catch (e) {
      toast.error('Logout failed');
    }
  };

  const findParentField = (fields: any[], id: string): any | null => {
    for (const f of fields) {
      if (f.children?.some((c: any) => c.id === id)) return f;
      if (f.children) {
        const parent = findParentField(f.children, id);
        if (parent) return parent;
      }
    }
    return null;
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
    const overData = over.data.current;

    // Handle dropping new fields from sidebar
    if (activeData?.isSidebarBtn) {
      if (over.id === 'sidebar-palette') return;

      // 1. Drop into a section container header/dropzone
      if (overData?.isSection) {
        addField(activeData.type, overData.parentId);
        return;
      }

      // 2. Drop over a specific field (potentially nested)
      const parent = findParentField(schema.fields, over.id as string);
      const targetList = parent ? parent.children : schema.fields;
      const overIndex = targetList.findIndex((f: any) => f.id === over.id);

      if (overIndex !== -1) {
        insertField(activeData.type, overIndex, parent?.id);
      } else if (over.id === 'canvas-droppable' || over.id === 'canvas-drop-bottom') {
        addField(activeData.type);
      }
      return;
    }

    // Handle reordering existing fields
    if (active.id !== over.id) {
      const activeParent = findParentField(schema.fields, active.id as string);
      const overParent = findParentField(schema.fields, over.id as string);

      // Reordering within the same container
      if (activeParent?.id === overParent?.id) {
        const targetList = activeParent ? activeParent.children : schema.fields;
        const oldIndex = targetList.findIndex((f: any) => f.id === active.id);
        const newIndex = targetList.findIndex((f: any) => f.id === over.id);
        reorderFields(arrayMove(targetList, oldIndex, newIndex), activeParent?.id);
      } else {
        // Moving between containers (Optional enhancement - for now just prevent or handle simply)
        // If moving between containers, we'd need a more complex store action.
        // For now, let's just handle it if it happens.
      }
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
      <div className="flex flex-col h-screen w-full overflow-hidden" style={{ background: 'var(--canvas-bg)' }}>
        {/* Global Header removed from Builder */}

        <div className="flex flex-col flex-1 overflow-hidden">
          {/* ── Builder Toolbar (Sub-Header) ── */}
          <div 
            className="h-14 border-b flex items-center justify-between px-6 shrink-0 z-20"
            style={{ background: 'var(--bg-header)', borderColor: 'var(--border)' }}
          >
            {/* Left: Back Button, Form title & Status */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="p-2 rounded-lg hover:bg-[var(--bg-muted)] transition-colors group"
                title="Back to Dashboard"
              >
                <Plus className="rotate-45 text-[var(--text-muted)] group-hover:text-[var(--accent)]" size={20} />
              </button>

              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-[var(--text-faint)] uppercase tracking-widest pl-0.5">Form Title</span>
                    <input
                      type="text"
                      value={schema.title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="bg-transparent border-none p-0 text-sm font-bold focus:ring-0 w-[240px] focus:outline-none"
                      style={{ color: 'var(--text-primary)' }}
                      placeholder="Untitled Form"
                    />
                  </div>
                  
                  <div className="h-8 w-px bg-[var(--border)] mx-1" />

                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-[var(--text-faint)] uppercase tracking-widest pl-0.5">Form Code identifier</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-[var(--accent)]">/</span>
                      <input
                        type="text"
                        value={schema.code || ''}
                        onChange={(e) => useFormStore.setState(s => ({ schema: { ...s.schema, code: e.target.value.toLowerCase().replace(/[^a-z0-9_]+/g, '_') } }))}
                        disabled={schema.codeLocked}
                        className="bg-transparent border-none p-0 text-xs font-bold focus:ring-0 w-[140px] focus:outline-none"
                        style={{ color: schema.codeLocked ? 'var(--text-faint)' : 'var(--text-secondary)' }}
                        placeholder={schema.codeLocked ? 'locked' : 'unique_code...'}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[9px] font-bold text-[var(--accent)] uppercase tracking-[0.2em] bg-[var(--accent-subtle)] px-1.5 py-0.5 rounded">
                    {schema.status}
                  </span>
                  <span className="text-[9px] font-semibold opacity-40 uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
                    {editFormId ? 'Persistent V-ID' : 'Transient Draft'}
                  </span>
                  {isSaving && <span className="text-[9px] font-black animate-pulse text-blue-500 uppercase tracking-widest">. Saving</span>}
                </div>
              </div>
            </div>

            {/* Centre: View Mode Switcher - Hidden on tiny screens or simplified */}
            <div className="hidden sm:flex bg-[var(--bg-muted)] p-1 rounded-lg border border-[var(--border)]">
              <button
                onClick={() => setActiveTab('EDITOR')}
                className={`flex items-center gap-2 px-3 py-1 text-xs font-bold rounded-md transition-all ${activeTab === 'EDITOR' ? 'bg-[var(--card-bg)] shadow-sm text-[var(--accent)]' : 'text-[var(--text-faint)]'}`}
              >
                <Layout size={13} /> Editor
              </button>
              {/* <button
                onClick={() => setActiveTab('LOGIC')}
                className={`flex items-center gap-2 px-3 py-1 text-xs font-bold rounded-md transition-all ${activeTab === 'LOGIC' ? 'bg-[var(--card-bg)] shadow-sm text-[var(--accent)]' : 'text-[var(--text-faint)]'}`}
              >
                <Link2 size={13} /> Logic
              </button> */}
              <button
                onClick={() => setActiveTab('VALIDATIONS')}
                className={`flex items-center gap-2 px-3 py-1 text-xs font-bold rounded-md transition-all ${activeTab === 'VALIDATIONS' ? 'bg-[var(--card-bg)] shadow-sm text-[var(--accent)]' : 'text-[var(--text-faint)]'}`}
              >
                <Check size={13} /> Validations
              </button>
              <button
                onClick={() => setActiveTab('VERSIONS')}
                className={`flex items-center gap-2 px-3 py-1 text-xs font-bold rounded-md transition-all ${activeTab === 'VERSIONS' ? 'bg-[var(--card-bg)] shadow-sm text-[var(--accent)]' : 'text-[var(--text-faint)]'}`}
              >
                <Archive size={13} /> Versions
              </button>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setThemePanelOpen(!isThemePanelOpen)}
                className={`p-2 rounded-lg transition-colors shrink-0 ${isThemePanelOpen ? 'bg-[var(--accent)] text-white' : ''}`}
                style={!isThemePanelOpen ? { color: 'var(--text-muted)' } : {}}
                title="Theme Options"
              >
                <Palette size={16} />
              </button>

              {hasPermission('WRITE') && (
                <button
                  onClick={async () => {
                    try {
                      const payload: any = { ...schema, status: 'DRAFT' };
                      const saved = await saveForm(payload);
                      window.open(`/f/${saved.publicShareToken}`, '_blank');
                    } catch (e) {
                      toast.error("Save failed before preview");
                    }
                  }}
                  className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-[var(--bg-muted)] transition-all"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <Eye size={14} /> Preview
                </button>
              )}

              {/* Workflow - Hidden for now as per user request */}
              {/* <button
                onClick={() => setIsWorkflowModalOpen(true)}
                className="flex items-center justify-center w-8 h-8 sm:w-auto sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold text-white gradient-accent shadow-sm hover:shadow-md shrink-0"
              >
                <ShieldAlert size={14} className="sm:mr-1.5" /> <span className="hidden lg:inline">Request Approval</span>
              </button> */}

              {isAdminOrBuilder && (
                <>
                  <button
                    onClick={() => handleSave('DRAFT')}
                    disabled={isSaving}
                    className="flex items-center justify-center w-8 h-8 sm:w-auto sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold border bg-[var(--bg-muted)] hover:bg-[var(--bg-subtle)] transition-all shrink-0"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                  >
                    <Save size={14} className="sm:mr-1.5" /> <span className="hidden sm:inline">Save</span>
                  </button>

                  <button
                    onClick={() => handleSave('PUBLISHED')}
                    disabled={isSaving || !isDirty}
                    className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-black shadow-sm transition-all uppercase tracking-widest shrink-0 ${isSaving || !isDirty ? 'bg-[var(--bg-muted)] text-[var(--text-muted)] border border-[var(--border)] cursor-not-allowed' : 'gradient-accent text-white hover:shadow-md'}`}
                  >
                    {isSaving ? '...' : (status === 'PUBLISHED' && !isDirty ? 'Published' : 'Publish')}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden relative">
            {/* ── Mobile View Toggle Tabs ── */}
            <div className="flex lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-[var(--card-bg)] border border-[var(--border)] p-1.5 rounded-2xl shadow-2xl backdrop-blur-xl">
              <button
                onClick={() => setActiveMobileTab('PALETTE')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeMobileTab === 'PALETTE' ? 'bg-[var(--accent)] text-white shadow-lg' : 'text-[var(--text-muted)]'}`}
              >
                <Plus size={14} /> 
                <span className={activeMobileTab === 'PALETTE' ? 'inline' : 'hidden md:inline'}>Fields</span>
              </button>
              <button
                onClick={() => setActiveMobileTab('CANVAS')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeMobileTab === 'CANVAS' ? 'bg-[var(--accent)] text-white shadow-lg' : 'text-[var(--text-muted)]'}`}
              >
                <Layout size={14} /> 
                <span className={activeMobileTab === 'CANVAS' ? 'inline' : 'hidden md:inline'}>Canvas</span>
              </button>
              <button
                onClick={() => setActiveMobileTab('PROPERTIES')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeMobileTab === 'PROPERTIES' ? 'bg-[var(--accent)] text-white shadow-lg' : 'text-[var(--text-muted)]'}`}
              >
                <Settings2 size={14} /> 
                <span className={activeMobileTab === 'PROPERTIES' ? 'inline' : 'hidden md:inline'}>Setup</span>
              </button>
            </div>

            {/* 1. Sidebar (Palette) */}
            {activeTab === 'EDITOR' && (
              <div className={`${activeMobileTab === 'PALETTE' ? 'flex flex-1' : 'hidden lg:flex'} h-full overflow-hidden border-r`} style={{ borderColor: 'var(--border)' }}>
                <Sidebar />
              </div>
            )}

            {/* 2. Main content (Canvas / Panels) */}
            <main className={`flex-1 flex flex-col min-w-0 h-full overflow-hidden ${activeTab === 'EDITOR' && activeMobileTab !== 'CANVAS' ? 'hidden lg:flex' : 'flex'}`}>
              {activeTab === 'EDITOR' ? (
                <Canvas />
              ) : activeTab === 'LOGIC' ? (
                <LogicPanel />
              ) : activeTab === 'VALIDATIONS' ? (
                <CustomValidationsPanel 
                  fields={schema.fields.map(f => ({ columnName: f.columnName, label: f.label }))}
                  rules={formValidations}
                  onChange={setFormValidations}
                />
              ) : (
                <VersionsPanel editFormId={editFormId} />
              )}
            </main>

            {/* 3. Right panel (Properties) */}
            {activeTab === 'EDITOR' && (
              <>
                <div className={`${activeMobileTab === 'PROPERTIES' ? 'flex flex-1' : 'hidden lg:flex'} h-full overflow-hidden border-l`} style={{ borderColor: 'var(--border)' }}>
                  <PropertiesPanel />
                </div>
                <DragOverlay>{renderOverlay()}</DragOverlay>
              </>
            )}
          </div>
        </div>

        {/* Workflow Initiation Modal */}
        {isWorkflowModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-xl bg-black/60 animate-in fade-in duration-300">
            <div className="w-full max-w-2xl rounded-[3rem] border shadow-2xl bg-[var(--card-bg)] border-[var(--card-border)] animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col overflow-hidden">
              
              {/* Modal Header */}
              <div className="px-10 pt-10 pb-6 flex justify-between items-center shrink-0">
                <div>
                  <h2 className="text-3xl font-black tracking-tighter uppercase leading-none mb-2">Initiate <span className="gradient-text">Approval</span></h2>
                  <p className="text-[10px] font-black text-[var(--text-faint)] uppercase tracking-[0.2em]">Select your chain of responsibility</p>
                </div>
                <button 
                  onClick={() => setIsWorkflowModalOpen(false)}
                  className="w-12 h-12 rounded-full flex items-center justify-center hover:bg-[var(--bg-muted)] transition-all transform hover:rotate-90 group"
                >
                  <Plus className="rotate-45 text-[var(--text-muted)] group-hover:text-[var(--accent)]" size={28} />
                </button>
              </div>

              {/* Modal Body - Scrollable */}
              <div className="flex-1 overflow-y-auto px-10 pb-10 custom-scrollbar style={{ scrollbarGutter: 'stable' }}">
                <div className="space-y-8">
                  {/* Workflow Type Selector */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] ml-1 text-[var(--text-faint)]">Approval Strategy</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { id: 'NORMAL', label: 'Self Publish', desc: 'Direct approval' },
                        { id: 'LEVEL_1', label: 'Level 1 Flow', desc: '1-Step Review' },
                        { id: 'LEVEL_2', label: 'Level 2 Flow', desc: '2-Step Review' }
                      ].map((t) => (
                        <button
                          key={t.id}
                          onClick={() => {
                            setWorkflowType(t.id as any);
                            setSelectedApproverIds([]);
                          }}
                          className={`p-5 rounded-3xl border-2 transition-all text-left ${workflowType === t.id ? 'border-[var(--accent)] bg-[var(--accent-subtle)] shadow-xl -translate-y-1' : 'border-[var(--border)] bg-[var(--card-bg)] hover:border-[var(--text-faint)]'}`}
                        >
                          <p className={`text-xs font-black mb-1 ${workflowType === t.id ? 'text-[var(--accent)]' : ''}`}>{t.label}</p>
                          <p className="text-[9px] font-bold opacity-50 leading-tight uppercase tracking-tight">{t.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Authority Chain */}
                  <div className="space-y-6 bg-[var(--bg-muted)] p-8 rounded-[2rem] border border-[var(--border)] relative overflow-hidden">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-full gradient-accent flex items-center justify-center text-white">
                        <GitBranch size={16} />
                      </div>
                      <h4 className="text-xs font-black uppercase tracking-widest">Workflow Chain</h4>
                    </div>

                    <div className="space-y-8 relative">
                      {/* Vertical line connector */}
                      <div className="absolute left-6 top-8 bottom-8 w-px border-l-2 border-dashed border-[var(--border)]"></div>

                      {/* Intermediate steps */}
                      {(workflowType === 'LEVEL_1' || workflowType === 'LEVEL_2') && (
                        <div className="relative flex items-start gap-6">
                          <div className="w-12 h-12 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] flex items-center justify-center font-black text-xs z-10 shrink-0">1</div>
                          <div className="flex-1">
                            <label className="text-[10px] font-black uppercase tracking-widest mb-2 block opacity-50">Intermediate Authority</label>
                            <select 
                              value={selectedApproverIds[0] || ''}
                              onChange={(e) => {
                                const newIds = [...selectedApproverIds];
                                newIds[0] = e.target.value;
                                setSelectedApproverIds(newIds);
                              }}
                              className="w-full px-5 py-4 rounded-xl border bg-[var(--card-bg)] focus:ring-2 focus:ring-[var(--accent)] outline-none appearance-none font-bold text-sm"
                            >
                              <option value="">Choose Custom Authority...</option>
                              {availableCustomApprovers.map(u => <option key={u.id} value={u.id}>{u.username} ({u.roles.join(', ')})</option>)}
                            </select>
                          </div>
                        </div>
                      )}

                      {workflowType === 'LEVEL_2' && (
                        <div className="relative flex items-start gap-6">
                          <div className="w-12 h-12 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] flex items-center justify-center font-black text-xs z-10 shrink-0">2</div>
                          <div className="flex-1">
                            <label className="text-[10px] font-black uppercase tracking-widest mb-2 block opacity-50">Secondary Reviewer</label>
                            <select 
                              value={selectedApproverIds[1] || ''}
                              onChange={(e) => {
                                const newIds = [...selectedApproverIds];
                                newIds[1] = e.target.value;
                                setSelectedApproverIds(newIds);
                              }}
                              className="w-full px-5 py-4 rounded-xl border bg-[var(--card-bg)] focus:ring-2 focus:ring-[var(--accent)] outline-none appearance-none font-bold text-sm"
                            >
                              <option value="">Choose Custom Authority...</option>
                              {availableCustomApprovers
                                .filter(u => u.id.toString() !== selectedApproverIds[0])
                                .map(u => <option key={u.id} value={u.id}>{u.username} ({u.roles.join(', ')})</option>)}
                            </select>
                          </div>
                        </div>
                      )}

                      {/* Final step (Builder) */}
                      <div className="relative flex items-start gap-6">
                        <div className="w-12 h-12 rounded-2xl bg-[var(--accent)] text-white flex items-center justify-center font-black text-xs z-10 shrink-0 shadow-lg shadow-blue-500/20">
                          {workflowType === 'NORMAL' ? '1' : workflowType === 'LEVEL_1' ? '2' : '3'}
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] font-black uppercase tracking-widest mb-2 block text-[var(--accent)]">Final Target (Builder)</label>
                          <select 
                            value={selectedBuilderId}
                            onChange={(e) => setSelectedBuilderId(e.target.value)}
                            className="w-full px-5 py-4 rounded-xl border border-[var(--accent)] bg-[var(--card-bg)] focus:ring-2 focus:ring-[var(--accent)] outline-none appearance-none font-black text-sm"
                          >
                            <option value="">Select Target Builder...</option>
                            {availableBuilders.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                          </select>
                          <p className="mt-2 text-[10px] font-medium text-[var(--text-muted)] italic flex items-center gap-1">
                            <ShieldAlert size={10} /> After approval, this person will own this form.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <button 
                      onClick={handleInitiateWorkflow}
                      disabled={isSaving}
                      className="w-full py-5 rounded-3xl text-sm font-black text-white gradient-accent shadow-xl shadow-blue-500/30 hover:shadow-2xl hover:-translate-y-1 transition-all disabled:opacity-50 uppercase tracking-[0.2em]"
                    >
                      {isSaving ? 'Processing Chain...' : 'Submit Request →'}
                    </button>
                    <p className="text-center mt-4 text-[9px] font-bold text-[var(--text-faint)] uppercase tracking-widest">Form will be locked during approval process</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
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