'use client';

/**
 * Responses Page — /forms/[id]/responses
 *
 * Admin-only view for a single form's submission data. Displays all collected
 * responses in a scrollable data table, with one column per form field plus
 * system columns (ID, Date). Each row has Edit and Delete action buttons.
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Download, ArrowLeft, Plus, Trash2, Edit, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, ArrowUp, ArrowDown, CheckSquare, Square, X, FileSpreadsheet, FileJson, FileText, ChevronDown, Eye, Filter, RefreshCcw, Settings2, LayoutGrid, List, CheckCircle, Clock } from 'lucide-react';
import { deleteSubmission, deleteSubmissionsBulk, getSubmissions, updateSubmissionStatusBulk, restoreSubmission, restoreSubmissionsBulk } from '@/services/api';
import { extractApiError } from '@/utils/error-handler';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from 'sonner';
import ThemeToggle from '@/components/ThemeToggle';
import SubmissionDetailDrawer from '@/components/SubmissionDetailDrawer';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface FormHeader {
  key: string;
  label: string;
  type?: string;
}

export default function ResponsesPage() {
  const params = useParams();
  const router = useRouter();
  const formId = params.id as string;
  const { hasPermission, isLoading: permsLoading } = usePermissions();

  const [headers, setHeaders] = useState<FormHeader[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formVersion, setFormVersion] = useState<number | null>(null);
  const [publicToken, setPublicToken] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Sorting, Filtering & Pagination States
  const [searchTerm, setSearchTerm] = useState('');
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'submitted_at', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [debouncedColumnFilters, setDebouncedColumnFilters] = useState<Record<string, string>>({});

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Detail Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);

  // View Mode (Grid vs Table)
  const [viewMode, setViewMode] = useState<'TABLE' | 'GRID'>('TABLE');

  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set());
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Version Filtering Extensions
  const [allVersions, setAllVersions] = useState<any[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string | 'all'>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [showDeletedRows, setShowDeletedRows] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Debounce column filters
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedColumnFilters(columnFilters);
    }, 500);
    return () => clearTimeout(timer);
  }, [columnFilters]);
  
  const fetchData = async (signal?: AbortSignal) => {
    if (!formId) return;
    setIsFetching(true);
    try {
      // 1. Fetch Form Meta (to get headers)
      const formRes = await fetch(`http://localhost:8080/api/v1/forms/${formId}`, { 
        credentials: 'include',
        signal 
      });
      
      if (formRes.status === 401) {
        router.push('/login');
        return;
      }
      if (!formRes.ok) {
        const errMsg = await extractApiError(formRes);
        throw new Error(errMsg);
      }

      const formData = await formRes.json();
      setFormTitle(formData.title);
      setPublicToken(formData.publicShareToken);
      
      const versions = formData.versions || [];
      setAllVersions(versions);

      // Determine which version to use for column headers
      let targetVersion = null;
      if (selectedVersionId === 'all') {
        targetVersion = versions.find((v: any) => v.isActive) || versions[0];
      } else {
        targetVersion = versions.find((v: any) => v.id.toString() === selectedVersionId);
      }

      setFormVersion(targetVersion?.versionNumber || null);
      
      const currentFields = (targetVersion?.fields || [])
        .filter((f: any) => f.fieldType !== 'SECTION_HEADER' && f.fieldType !== 'PAGE_BREAK')
        .sort((a: any, b: any) => (a.ordinalPosition || 0) - (b.ordinalPosition || 0));
        
      const currentFieldNames = new Set(currentFields.map((f: any) => f.columnName));

      // 2. Fetch Submissions with Pagination, Sorting, and Filtering
      const apiFilters: any = { ...debouncedColumnFilters };
      if (debouncedSearchTerm) apiFilters['q'] = debouncedSearchTerm;
      if (selectedVersionId !== 'all') apiFilters['form_version_id'] = selectedVersionId;
      if (showDeletedRows) apiFilters['include_deleted'] = 'true';

      const response = await getSubmissions(
        formId,
        currentPage - 1,
        pageSize,
        sortConfig.key || 'submitted_at',
        sortConfig.direction?.toUpperCase() || 'DESC',
        apiFilters
      );

      setData(response.content);
      setTotalElements(response.totalElements);
      setTotalPages(response.totalPages);

      // 3. Build Headers
      let ghostHeaders: FormHeader[] = [];
      if (showArchived && response.content.length > 0) {
        const allDbKeys = Object.keys(response.content[0]);
        const ghostKeys = allDbKeys.filter(key =>
          key !== 'submission_id' && key !== 'submitted_at' && key !== 'submission_status' && 
          key !== 'form_version_id' && key !== 'is_deleted' && key !== 'is_draft' && key !== 'submitted_by' &&
          !currentFieldNames.has(key)
        );
        ghostHeaders = ghostKeys.map(key => ({ key, label: `${formatLabel(key)} (Archived)` }));
      }

      const standardHeaders = [
        { key: 'serial_no', label: 'ID' },
        { key: 'submission_status', label: 'Status' },
        { key: 'submitted_at', label: 'Date' }
      ];
      const formHeaders = currentFields.map((f: any) => ({
        key: f.columnName, label: f.fieldLabel, type: f.fieldType
      }));

      // Only force reset visible columns if headers actually change structure
      const newHeaders = [...standardHeaders, ...formHeaders, ...ghostHeaders];
      setHeaders(newHeaders);
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      console.error("Error loading responses:", error);
      toast.error(error.message || "Failed to load response data");
    } finally {
      setIsFetching(false);
      setIsInitialLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [formId, currentPage, pageSize, sortConfig, debouncedColumnFilters, debouncedSearchTerm, selectedVersionId, showArchived, showDeletedRows]);

  // Reset headers when form changes
  useEffect(() => {
    setHeaders([]);
    setCurrentPage(1);
  }, [formId]);


  // Sync visible columns when headers are initially loaded
  useEffect(() => {
    if (headers.length > 0 && visibleColumns.size === 0) {
      setVisibleColumns(new Set(headers.map(h => h.key)));
    }
  }, [headers]);

  const formatLabel = (key: string) =>
    key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  const formatCellValue = (value: any, type?: string) => {
    if (value === null || value === undefined) return <span className="text-(--text-faint) italic">—</span>;

    if (type === 'FILE' && value) {
      return (
        <a
          href={`http://localhost:8080${value}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors hover:bg-(--accent) hover:text-white"
          style={{ background: 'var(--accent-subtle)', color: 'var(--accent)', borderColor: 'var(--accent-muted)' }}
        >
          <Download size={10} /> FILE
        </a>
      );
    }

    if (typeof value === 'boolean') {
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
          value ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {value ? 'Yes' : 'No'}
        </span>
      );
    }

    // JSON Formatting for complex fields
    if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return (
            <div className="flex gap-1 overflow-hidden" title={parsed.join(', ')}>
              {parsed.slice(0, 2).map((p, i) => (
                <span key={i} className="px-1.5 py-0.5 rounded bg-(--bg-muted) text-[10px] border border-(--border)">
                  {String(p)}
                </span>
              ))}
              {parsed.length > 2 && <span className="text-[10px] text-(--text-faint)">+{parsed.length - 2}</span>}
            </div>
          );
        }
      } catch (e) {}
    }

    const str = String(value);
    if (str.length > 30) {
      return <span title={str}>{str.substring(0, 27)}...</span>;
    }

    return str;
  };

  // --- Export Logic ---

  const prepareExportData = (): any[][] => {
    // 7.1: Export only visible columns, strictly following form definition order
    const exportHeaders = headers.filter(h => visibleColumns.has(h.key));
    if (data.length === 0 || exportHeaders.length === 0) return [];
    
    // Header Row
    const headerRow = exportHeaders.map(h => h.label);

    // Data Rows
    const dataRows = data.map((row, idx) => {
      return exportHeaders.map(header => {
        let value: any = '';
        if (header.key === 'serial_no') {
          const globalIdx = (currentPage - 1) * pageSize + idx;
          value = globalIdx + 1;
        } else if (header.key === 'submitted_at') {
          value = new Date(row[header.key]).toLocaleString();
        } else {
          value = row[header.key] || '';
        }

        // 7.2: CSV Injection Protection
        const strVal = String(value);
        if (strVal.startsWith('=') || strVal.startsWith('+') || strVal.startsWith('-') || strVal.startsWith('@')) {
          value = `'${strVal}`;
        }

        return value;
      });
    });

    return [headerRow, ...dataRows];
  };

  const downloadCSV = async () => {
    try {
      const exportCols = headers.filter(h => visibleColumns.has(h.key)).map(h => h.key).join(',');
      const params = new URLSearchParams();
      params.append('columns', exportCols);
      params.append('sortBy', sortConfig.key);
      params.append('sortOrder', sortConfig.direction.toUpperCase());
      params.append('include_deleted', String(showDeletedRows));
      if (searchTerm) params.append('q', searchTerm);
      Object.entries(columnFilters).forEach(([key, val]) => {
        params.append(key, val);
      });

      const res = await fetch(`http://localhost:8080/api/v1/forms/${formId}/submissions/export?${params.toString()}`, { credentials: 'include' });
      if (!res.ok) {
        const msg = await extractApiError(res);
        throw new Error(msg);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${formTitle.replace(/\s+/g, '_')}_responses.csv`;
      a.click();
      setShowExportMenu(false);
      toast.success("CSV Downloaded Successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate CSV export");
    }
  };

  const downloadXLSX = () => {
    const aoaData = prepareExportData();
    if (aoaData.length === 0) {
      toast.info("No data available to export");
      return;
    }
    const worksheet = XLSX.utils.aoa_to_sheet(aoaData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Responses");
    XLSX.writeFile(workbook, `${formTitle.replace(/\s+/g, '_')}_responses.xlsx`);
    setShowExportMenu(false);
  };

  const downloadPDF = () => {
    const aoaData = prepareExportData();
    if (aoaData.length === 0) {
      toast.info("No data available to export");
      return;
    }
    const doc = new jsPDF('landscape');
    const tableHeaders = aoaData[0];
    const tableData = aoaData.slice(1);

    doc.text(formTitle, 14, 15);
    autoTable(doc, {
      head: [tableHeaders],
      body: tableData,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] }
    });

    doc.save(`${formTitle.replace(/\s+/g, '_')}_responses.pdf`);
    setShowExportMenu(false);
  };

  const handleDelete = (idOrIds: string | string[]) => {
    const isBulk = Array.isArray(idOrIds);
    const count = isBulk ? idOrIds.length : 1;

    toast(`Delete ${count} response${count > 1 ? 's' : ''}?`, {
      description: 'The record will be moved to the trash.',
      action: {
        label: 'Delete',
        onClick: async () => {
          try {
            if (isBulk) {
              await deleteSubmissionsBulk(formId, idOrIds as string[]);
              if (showDeletedRows) {
                // If we are showing deleted rows, just refresh the data to update status
                fetchData();
              } else {
                setData((prevData) => prevData.filter(row => !idOrIds.includes(row.submission_id)));
              }
              setSelectedIds(new Set());
            } else {
              await deleteSubmission(formId, idOrIds as string);
              if (showDeletedRows) {
                fetchData();
              } else {
                setData((prevData) => prevData.filter(row => row.submission_id !== idOrIds));
              }
              const newSelected = new Set(selectedIds);
              newSelected.delete(idOrIds as string);
              setSelectedIds(newSelected);
            }
            toast.success(`${count} response${count > 1 ? 's' : ''} deleted`);
          } catch (err: any) {
            toast.error(err.message || "Failed to delete response");
          }
        }
      },
      cancel: { label: 'Cancel', onClick: () => { } }
    });
  };

  const handleRestore = async (idOrIds: string | string[]) => {
    const isBulk = Array.isArray(idOrIds);
    const count = isBulk ? idOrIds.length : 1;

    try {
      if (isBulk) {
        await restoreSubmissionsBulk(formId, idOrIds as string[]);
        setSelectedIds(new Set());
      } else {
        await restoreSubmission(formId, idOrIds as string);
      }
      toast.success(`${count} response${count > 1 ? 's' : ''} restored`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to restore response");
    }
  };

  // SRS: Bulk status update handler
  const handleBulkStatusUpdate = async (newStatus: 'SUBMITTED' | 'RESPONSE_DRAFT') => {
    const ids = Array.from(selectedIds);
    const count = ids.length;
    const statusLabel = newStatus === 'SUBMITTED' ? 'Submitted' : 'Draft';

    try {
      await updateSubmissionStatusBulk(formId, ids, newStatus);
      // Update local data to reflect new status
      setData((prevData) => prevData.map(row =>
        ids.includes(row.submission_id)
          ? { ...row, submission_status: newStatus }
          : row
      ));
      setSelectedIds(new Set());
      toast.success(`${count} response${count > 1 ? 's' : ''} marked as ${statusLabel}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  // --- Data Processing Logic ---
  const paginatedData = data;

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1); // Reset to first page
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) return <ArrowUpDown size={14} className="opacity-30" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-blue-500" /> : <ArrowDown size={14} className="text-blue-500" />;
  };

  // Selection helpers
  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedData.length && paginatedData.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedData.map(r => r.submission_id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  if (isInitialLoading && headers.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: '#f8fafc', color: '#64748b' }}>
        <div className="flex flex-col items-center gap-4">
          <RefreshCcw size={32} className="animate-spin text-blue-500" />
          <p className="text-sm font-bold uppercase tracking-widest opacity-50">Initializing Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans transition-colors duration-300" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* ── SaaS Header ── */}
      <header
        className="sticky top-0 z-40 border-b backdrop-blur-md"
        style={{ background: 'var(--header-bg)', borderColor: 'var(--border)' }}
      >
        <div className="max-w-[1600px] mx-auto px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() => router.push('/')}
              className="p-2 rounded-xl transition-all hover:bg-(--bg-muted) group shrink-0"
              style={{ color: 'var(--text-muted)' }} 
            >
              <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5 overflow-hidden">
                <span className="hidden sm:inline text-[8px] font-black uppercase tracking-[0.2em] text-(--text-faint) whitespace-nowrap">Responses Page</span>
                <span className="hidden sm:inline text-(--border) font-light">/</span>
                <h1 className="text-base sm:text-xl font-extrabold tracking-tight truncate" style={{ color: 'var(--text-primary)' }}>{formTitle}</h1>
                {formVersion !== null && (
                  <span className="shrink-0 px-2 py-0.5 rounded-md bg-(--accent-subtle) text-(--accent) text-[10px] font-black uppercase tracking-widest border border-(--accent-muted)">
                    v{formVersion}.0
                  </span>
                )}
                <span className="shrink-0 px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 text-[8px] sm:text-[10px] font-bold uppercase tracking-wider border border-emerald-500/20">Live</span>
              </div>
              <p className="text-[10px] sm:text-xs font-medium truncate" style={{ color: 'var(--text-muted)' }}>
                {totalElements} <span className="hidden xs:inline">Submissions</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            
            <a
              href={`/f/${publicToken}`}
              target="_blank"
              className="flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-95"
              style={{ background: '#2563eb' }} 
            >
              <Plus size={14} className="sm:size-4" /> <span className="hidden xs:inline">New Record</span>
            </a>
          </div>
        </div>
      </header>

      {/* ── SaaS Toolbar ── */}
      <div className="max-w-[1600px] mx-auto px-8 py-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-2xl border shadow-sm mb-6" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <div className="relative group w-full md:w-96">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors"
              style={{ color: searchTerm ? '#2563eb' : '#94a3b8' }}
            />
            <input
              type="text"
              placeholder="Search all columns (Global Search)..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-12 pr-4 py-3 rounded-xl text-sm border-0 transition-all focus:ring-2 focus:ring-blue-500/20"
              style={{ background: 'var(--bg-muted)', color: 'var(--text-primary)' }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Version Filter */}
            <div className="relative shrink-0">
               <select
                value={selectedVersionId}
                onChange={(e) => {
                  setSelectedVersionId(e.target.value);
                  setCurrentPage(1);
                  setHeaders([]); // Force full re-eval of columns
                }}
                className="pl-4 pr-10 py-2.5 rounded-xl text-xs font-bold border transition-all hover:border-blue-400 focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
              >
                <option value="all">All Versions</option>
                {allVersions.map((v: any) => (
                  <option key={v.id} value={v.id.toString()}>
                    Version {v.versionNumber} {v.isActive ? '(Active)' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
            </div>
            {/* Advanced Filters */}
            <div className="relative">
              <button
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                  Object.keys(columnFilters).length > 0 || showFilterPanel ? 'bg-blue-600 border-blue-600 text-white' : 'hover:border-blue-400'
                }`}
                style={{ 
                  background: Object.keys(columnFilters).length > 0 || showFilterPanel ? '#2563eb' : 'var(--bg-surface)',
                  borderColor: Object.keys(columnFilters).length > 0 || showFilterPanel ? '#2563eb' : 'var(--border)',
                  color: Object.keys(columnFilters).length > 0 || showFilterPanel ? 'white' : 'var(--text-muted)'
                }}
              >
                <Filter size={16} /> 
                <span className="hidden lg:inline">Filters</span>
                {Object.keys(columnFilters).length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white text-blue-600 text-[10px]">{Object.keys(columnFilters).length}</span>
                )}
              </button>

              {showFilterPanel && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowFilterPanel(false)} />
                  <div className="absolute right-0 mt-3 w-80 rounded-2xl shadow-2xl border z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-6" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                    <div className="flex items-center justify-between mb-4 pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>Advanced Filtering</span>
                        <span className="text-[9px]" style={{ color: 'var(--text-faint)' }}>Match specific column values</span>
                      </div>
                      <button 
                        onClick={() => { setColumnFilters({}); setCurrentPage(1); }} 
                        className="text-[10px] font-bold text-blue-600 hover:underline"
                      >
                        Reset
                      </button>
                    </div>
                    <div className="max-h-80 overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-[var(--border)]">
                      {headers.filter(h => h.key !== 'serial_no').map(header => (
                        <div key={header.key} className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-tight" style={{ color: 'var(--text-muted)' }}>{header.label}</label>
                          <input
                            type="text"
                            placeholder={`Filter ${header.label}...`}
                            value={columnFilters[header.key] || ''}
                            onChange={(e) => {
                              const newVal = e.target.value;
                              setColumnFilters(prev => {
                                const updated = { ...prev };
                                if (newVal) updated[header.key] = newVal;
                                else delete updated[header.key];
                                return updated;
                              });
                              setCurrentPage(1);
                            }}
                            className="w-full px-3 py-2 rounded-lg text-xs border transition-all outline-none"
                            style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* View Toggle */}
            <div className="hidden sm:flex p-1 rounded-xl border mr-2 shadow-inner" style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)' }}>
              <button
                onClick={() => setViewMode('TABLE')}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'TABLE' ? 'shadow-sm text-blue-600' : ''}`}
                style={{ background: viewMode === 'TABLE' ? 'var(--bg-surface)' : 'transparent', color: viewMode === 'TABLE' ? '#2563eb' : 'var(--text-faint)' }}
                title="Table View"
              >
                <List size={18} />
              </button>
              <button
                onClick={() => setViewMode('GRID')}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'GRID' ? 'shadow-sm text-blue-600' : ''}`}
                style={{ background: viewMode === 'GRID' ? 'var(--bg-surface)' : 'transparent', color: viewMode === 'GRID' ? '#2563eb' : 'var(--text-faint)' }}
                title="Grid View"
              >
                <LayoutGrid size={18} />
              </button>
            </div>

            {/* Column Config */}
            <div className="relative">
              <button
                onClick={() => setShowColumnConfig(!showColumnConfig)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                  showColumnConfig ? '' : 'hover:border-slate-300'
                }`}
                style={{
                  background: showColumnConfig ? 'var(--text-primary)' : 'var(--bg-surface)',
                  borderColor: showColumnConfig ? 'var(--text-primary)' : 'var(--border)',
                  color: showColumnConfig ? 'var(--bg-surface)' : 'var(--text-muted)'
                }}
              >
                <Settings2 size={16} /> 
                <span className="hidden lg:inline">Columns</span>
              </button>

              {showColumnConfig && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowColumnConfig(false)} />
                  <div className="absolute right-0 mt-3 w-72 rounded-2xl shadow-2xl border z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-6" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                    <div className="flex items-center justify-between mb-4 pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
                      <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>Layout Settings</span>
                      <button onClick={() => setVisibleColumns(new Set(headers.map(h => h.key)))} className="text-[10px] font-bold text-blue-600 hover:underline">Reset</button>
                    </div>
                    <div className="max-h-80 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-[var(--border)]">
                      {/* Archive Toggle */}
                      <label className="flex items-center justify-between cursor-pointer group pb-2 border-b border-(--border) mb-2">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Archived Fields</span>
                          <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>Show old/removed field values</span>
                        </div>
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-all"
                          checked={showArchived}
                          onChange={(e) => setShowArchived(e.target.checked)}
                        />
                      </label>

                      {/* Deleted Toggle */}
                      <label className="flex items-center justify-between cursor-pointer group pb-2 border-b border-(--border) mb-2">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Deleted Responses</span>
                          <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>Show records in trash</span>
                        </div>
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-all"
                          checked={showDeletedRows}
                          onChange={(e) => setShowDeletedRows(e.target.checked)}
                        />
                      </label>

                      {headers.map(header => (
                        <label key={header.key} className="flex items-center justify-between cursor-pointer group">
                          <span className="text-xs font-medium transition-colors" style={{ color: 'var(--text-muted)' }}>{header.label}</span>
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-all"
                            style={{ borderColor: 'var(--border)' }}
                            checked={visibleColumns.has(header.key)}
                            onChange={() => {
                              const newVisible = new Set(visibleColumns);
                              if (newVisible.has(header.key)) {
                                if (newVisible.size > 1) newVisible.delete(header.key);
                                else toast.error("At least one column must be visible");
                              } else {
                                newVisible.add(header.key);
                              }
                              setVisibleColumns(newVisible);
                            }}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Export */}
            {hasPermission('EXPORT', Number(formId)) && (
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all hover:border-slate-300"
                  style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                >
                  <Download size={16} /> 
                  <span className="hidden lg:inline">Export</span>
                  <ChevronDown size={14} className={`transition-transform duration-200 ${showExportMenu ? 'rotate-180' : ''}`} />
                </button>

                {showExportMenu && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setShowExportMenu(false)} />
                    <div className="absolute right-0 mt-3 w-56 rounded-2xl shadow-2xl border z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                      <div className="p-2">
                         <button onClick={downloadXLSX} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-colors hover:bg-(--bg-muted)" style={{ color: 'var(--text-primary)' }}>
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center"><FileSpreadsheet size={16} /></div> Excel (.xlsx)
                        </button>
                        <button onClick={downloadCSV} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-colors hover:bg-(--bg-muted)" style={{ color: 'var(--text-primary)' }}>
                          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center"><FileText size={16} /></div> CSV (.csv)
                        </button>
                        <button onClick={downloadPDF} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-colors hover:bg-(--bg-muted)" style={{ color: 'var(--text-primary)' }}>
                          <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center"><FileText size={16} /></div> PDF (.pdf)
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Active Filter Chips */}
        {(Object.keys(columnFilters).length > 0 || searchTerm) && (
          <div className="flex flex-wrap items-center gap-2 mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mr-2">Applied Filters:</span>
            
            {searchTerm && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-xs font-bold">
                <Search size={12} />
                <span>Global: {searchTerm}</span>
                <button onClick={() => setSearchTerm('')} className="hover:text-blue-900 transition-colors ml-1">
                  <X size={14} />
                </button>
              </div>
            )}

            {Object.entries(columnFilters).map(([key, value]) => {
              const header = headers.find(h => h.key === key);
              return (
                <div key={key} className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold shadow-sm" style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                  <Filter size={12} style={{ color: 'var(--text-muted)' }} />
                  <span className="font-medium" style={{ color: 'var(--text-muted)' }}>{header?.label || key}:</span>
                  <span>{value}</span>
                  <button 
                    onClick={() => {
                      setColumnFilters(prev => {
                        const updated = { ...prev };
                        delete updated[key];
                        return updated;
                      });
                    }}
                    className="hover:text-red-500 transition-colors ml-1"
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}

            {(Object.keys(columnFilters).length + (searchTerm ? 1 : 0)) > 1 && (
              <button 
                onClick={() => { setColumnFilters({}); setSearchTerm(''); setCurrentPage(1); }}
                className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500 transition-all ml-2 flex items-center gap-1 group"
              >
                <RefreshCcw size={10} className="group-hover:rotate-180 transition-transform duration-500" />
                Clear All
              </button>
            )}
          </div>
        )}

        {/* ── View Rendering ── */}
        <div className={`transition-all duration-300 ${isFetching ? 'opacity-40 grayscale-[0.5] pointer-events-none' : 'opacity-100'}`}>
          <div className="block sm:hidden mb-6">
            <div className="bg-blue-50 text-blue-600 p-3 rounded-2xl border border-blue-100 flex items-center gap-3">
              <LayoutGrid size={18} />
              <span className="text-xs font-black uppercase tracking-widest">Mobile Card View Active</span>
            </div>
          </div>

          {viewMode === 'TABLE' ? (
          <div className="rounded-3xl border shadow-sm overflow-hidden" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full border-separate border-spacing-0">
                <thead>
                  <tr className="bg-(--bg-muted)/50">
                    <th className="sticky top-0 px-6 py-5 text-left w-12 z-30 border-b bg-inherit" style={{ borderColor: 'var(--border)' }}>
                      <button
                        onClick={toggleSelectAll}
                        className={`p-2 rounded-lg transition-all ${selectedIds.size === paginatedData.length && paginatedData.length > 0 ? 'text-blue-600' : 'text-slate-300'}`}
                      >
                        {selectedIds.size === paginatedData.length && paginatedData.length > 0 ? <CheckSquare size={18} /> : <Square size={18} />}
                      </button>
                    </th>
                    {headers.filter(h => visibleColumns.has(h.key)).map((header) => (
                      <th
                        key={header.key}
                        onClick={() => handleSort(header.key)}
                        className="sticky top-0 px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest border-b cursor-pointer hover:bg-(--bg-hover) transition-colors z-20 bg-inherit"
                        style={{ color: 'var(--text-faint)', borderColor: 'var(--border)' }}
                      >
                        <div className="flex items-center gap-2">
                          {header.label}
                          {sortConfig.key === header.key ? (
                            sortConfig.direction === 'asc' ? <ArrowUp size={12} className="text-blue-500" /> : <ArrowDown size={12} className="text-blue-500" />
                          ) : (
                            <ArrowUpDown size={12} className="text-slate-300 opacity-0 group-hover:opacity-100" />
                          )}
                        </div>
                      </th>
                    ))}
                    <th className="sticky top-0 right-0 px-6 py-5 text-right text-[10px] font-black uppercase tracking-widest border-b z-30 bg-inherit" style={{ color: 'var(--text-faint)', borderColor: 'var(--border)' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                  {paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan={visibleColumns.size + 2} className="px-6 py-24 text-center">
                        <div className="flex flex-col items-center justify-center space-y-4">
                          <div className="w-16 h-16 rounded-3xl flex items-center justify-center" style={{ background: 'var(--bg-muted)', color: 'var(--text-faint)' }}>
                            <Search size={32} />
                          </div>
                          <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                            {searchTerm ? 'No matches found for your search.' : 'No responses yet.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((row, idx) => {
                      const globalIdx = (currentPage - 1) * pageSize + idx;
                      const isSelected = selectedIds.has(row.submission_id);
                      return (
                        <tr
                          key={row.submission_id}
                          className={`group/row transition-colors hover:bg-slate-50/50 ${row.is_deleted ? 'opacity-60 grayscale-[0.2]' : ''}`}
                          style={{ background: isSelected ? 'var(--bg-muted)' : (row.is_deleted ? '#fef2f2' : 'var(--bg-surface)') }} 
                        >
                          <td className="px-6 py-4 border-b border-slate-100">
                            <button
                              onClick={() => toggleSelect(row.submission_id)}
                              className="p-2 rounded-lg transition-all"
                              style={{ color: isSelected ? 'var(--accent)' : 'var(--text-faint)' }}
                            >
                              {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                            </button>
                          </td>
                          {headers.filter(h => visibleColumns.has(h.key)).map((header) => (
                            <td
                              key={`${row.submission_id}-${header.key}`}
                              className="px-6 py-4 text-sm border-b whitespace-nowrap"
                              style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }} 
                            >
                              {header.key === 'serial_no' ? (
                                <span className="font-mono text-slate-400">{globalIdx + 1}</span>
                              ) : header.key === 'submitted_at' ? (
                                <span className="text-slate-500">{new Date(row[header.key]).toLocaleString()}</span>
                              ) : header.key === 'submission_status' ? (
                                row.is_deleted ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-red-50 text-red-600 border-red-100">
                                    DELETED
                                  </span>
                                ) : (
                                  <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                      row[header.key] === 'RESPONSE_DRAFT' 
                                        ? 'bg-slate-100 text-slate-600 border-slate-200' 
                                        : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                    }`}
                                  >
                                    {row[header.key] || 'FINAL'}
                                  </span>
                                )
                              ) : (
                                <div className="max-w-[200px] truncate">
                                  {formatCellValue(row[header.key], header.type)}
                                </div>
                              )}
                            </td>
                          ))}
                          <td className="px-6 py-4 border-b text-right sticky right-0 z-10 bg-inherit" style={{ borderColor: 'var(--border)' }}>
                            <div className="flex justify-end gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                              <button
                                onClick={() => {
                                  setSelectedSubmission(row);
                                  setIsDrawerOpen(true);
                                }}
                                className="p-2 rounded-lg transition-all"
                                style={{ color: 'var(--text-faint)' }}
                                title="View Details"
                              >
                                <Eye size={16} />
                              </button>
                              <a
                                href={`/f/${publicToken}?edit=${row.submission_id}`}
                                className="p-2 rounded-lg transition-all"
                                style={{ color: 'var(--text-faint)' }}
                                title="Edit"
                              >
                                <Edit size={16} />
                              </a>
                              {row.is_deleted ? (
                                <button
                                  onClick={() => handleRestore(row.submission_id)}
                                  className="p-2 rounded-lg transition-all hover:bg-emerald-500/10 hover:text-emerald-500"
                                  style={{ color: 'var(--text-faint)' }}
                                  title="Restore"
                                >
                                  <RefreshCcw size={16} />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleDelete(row.submission_id)}
                                  className="p-2 rounded-lg transition-all hover:bg-red-500/10 hover:text-red-500"
                                  style={{ color: 'var(--text-faint)' }}
                                  title="Delete"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* ── Grid View ── */
          <div className="space-y-8">
            {paginatedData.length === 0 ? (
              <div className="rounded-3xl border border-dashed py-20 text-center" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                <div className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--bg-muted)', color: 'var(--text-faint)' }}>
                  <Search size={32} />
                </div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                  {searchTerm ? 'No matches found for your search.' : 'No responses yet.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {paginatedData.map((row, idx) => {
                  const globalIdx = (currentPage - 1) * pageSize + idx;
                  const isSelected = selectedIds.has(row.submission_id);
                  return (
                      <div
                        key={row.submission_id}
                        className={`group relative p-6 rounded-4xl border transition-all duration-300 ${
                          isSelected ? 'shadow-md translate-y-[-4px]' : 'hover:shadow-xl hover:translate-y-[-4px]'
                        } ${row.is_deleted ? 'opacity-60 grayscale-[0.2]' : ''}`}
                        style={{ 
                          background: isSelected ? 'var(--accent-subtle)' : (row.is_deleted ? '#fef2f2' : 'var(--bg-surface)'),
                          borderColor: isSelected ? 'var(--accent)' : 'var(--border)'
                        }}
                      >
                      {/* Checkbox Overlay */}
                      <button
                        onClick={() => toggleSelect(row.submission_id)}
                        className={`absolute top-6 left-6 p-2 rounded-xl transition-all z-10 border ${
                          isSelected ? 'bg-blue-600 text-white shadow-lg border-blue-600' : 'opacity-0 group-hover:opacity-100 shadow-sm'
                        }`}
                        style={{ 
                          background: isSelected ? '#2563eb' : 'var(--bg-muted)',
                          borderColor: isSelected ? '#2563eb' : 'var(--border)',
                          color: isSelected ? 'white' : 'var(--text-faint)'
                        }}
                      >
                        {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                      </button>

                      <div className="flex justify-end mb-6">
                        {row.is_deleted ? (
                          <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-red-50 text-red-600 border-red-100">
                            DELETED
                          </span>
                        ) : (
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            row.submission_status === 'RESPONSE_DRAFT' 
                              ? 'bg-amber-50 text-amber-600 border-amber-100' 
                              : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                          }`}>
                            {row.submission_status || 'FINAL'}
                          </span>
                        )}
                      </div>
                      
                      <div className="space-y-5 mb-8">
                        {headers.filter(h => visibleColumns.has(h.key) && h.key !== 'submission_status').slice(0, 5).map(header => (
                          <div key={header.key} className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>{header.label}</label>
                            <p className="text-sm font-bold truncate group-hover:text-blue-600 transition-colors" style={{ color: 'var(--text-primary)' }}>
                              {header.key === 'serial_no' ? globalIdx + 1 : header.key === 'submitted_at' ? new Date(row[header.key]).toLocaleDateString() : formatCellValue(row[header.key], header.type)}
                            </p>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold uppercase tracking-tight" style={{ color: 'var(--text-faint)' }}>Status</span>
                          <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                            {row.is_deleted ? 'Deleted' : (row.submission_status === 'RESPONSE_DRAFT' ? 'In Progress' : 'Completed')}
                          </span>
                        </div>
                        <div className="flex gap-1.5">
                           <button 
                            onClick={() => { setSelectedSubmission(row); setIsDrawerOpen(true); }} 
                            className="p-2.5 rounded-2xl transition-all active:scale-90 shadow-sm"
                            style={{ background: 'var(--bg-muted)', color: 'var(--text-faint)' }}
                            title="View Details"
                           >
                            <Eye size={18} />
                           </button>
                           <a 
                            href={`/f/${publicToken}?edit=${row.submission_id}`} 
                            className="p-2.5 rounded-2xl transition-all active:scale-90 shadow-sm"
                            style={{ background: 'var(--bg-muted)', color: 'var(--text-faint)' }}
                            title="Edit"
                           >
                            <Edit size={18} />
                           </a>
                           {row.is_deleted ? (
                              <button 
                               onClick={() => handleRestore(row.submission_id)} 
                               className="p-2.5 rounded-2xl transition-all active:scale-90 shadow-sm hover:bg-emerald-500/10 hover:text-emerald-500"
                               style={{ background: 'var(--bg-muted)', color: 'var(--text-faint)' }}
                               title="Restore"
                              >
                               <RefreshCcw size={18} />
                              </button>
                           ) : (
                              <button 
                               onClick={() => handleDelete(row.submission_id)} 
                               className="p-2.5 rounded-2xl transition-all active:scale-90 shadow-sm hover:bg-red-500/10 hover:text-red-500"
                               style={{ background: 'var(--bg-muted)', color: 'var(--text-faint)' }}
                               title="Delete"
                              >
                               <Trash2 size={18} />
                              </button>
                           )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

        {/* Pagination */}
        {totalElements > 0 && (
          <div className="rounded-3xl border shadow-sm overflow-hidden mt-8 px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Per Page</span>
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                  className="bg-transparent border text-xs font-bold rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500/20 outline-none"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                >
                  {[10, 20, 50, 100].map(size => (
                    <option key={size} value={size} style={{ background: 'var(--bg-surface)' }}>{size}</option>
                  ))}
                </select>
              </div>
              <div className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>
                {totalElements} records
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-2 rounded-xl border disabled:opacity-30 transition-all hover:bg-(--bg-muted)"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
              >
                <ChevronsLeft size={16} />
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-xl border disabled:opacity-30 transition-all hover:bg-(--bg-muted)"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
              >
                <ChevronLeft size={16} />
              </button>
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{currentPage}</span>
                <span style={{ color: 'var(--text-faint)' }}>/</span>
                <span style={{ color: 'var(--text-muted)' }}>{totalPages || 1}</span>
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-2 rounded-xl border disabled:opacity-30 transition-all hover:bg-(--bg-muted)"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-2 rounded-xl border disabled:opacity-30 transition-all hover:bg-(--bg-muted)"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
              >
                <ChevronsRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Detail Drawer ── */}
      <SubmissionDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        submission={selectedSubmission}
        headers={headers}
        formTitle={formTitle}
      />

      {/* ── Bulk Action Toolbar ── */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-4 px-6 py-3 rounded-2xl shadow-2xl bg-slate-900 text-white border border-slate-800">
            <div className="flex items-center gap-3 pr-4 border-r border-slate-700 font-bold text-xs">
              <span className="text-blue-400">{selectedIds.size}</span> Selected
            </div>
            <div className="flex items-center gap-2">
              {/* Status Update Buttons - Hidden in Trash View */}
              {!showDeletedRows && (
                <>
                  <button
                    onClick={() => handleBulkStatusUpdate('SUBMITTED')}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 transition-colors text-xs font-bold"
                    title="Mark as Submitted"
                  >
                    <CheckCircle size={14} /> Submitted
                  </button>
                  <button
                    onClick={() => handleBulkStatusUpdate('RESPONSE_DRAFT')}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 transition-colors text-xs font-bold"
                    title="Mark as Draft"
                  >
                    <Clock size={14} /> Draft
                  </button>
                  <div className="w-px h-6 bg-slate-700 mx-1" />
                </>
              )}
              {showDeletedRows ? (
                <button
                  onClick={() => handleRestore(Array.from(selectedIds))}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 transition-colors text-xs font-bold"
                >
                  <RefreshCcw size={14} /> Restore
                </button>
              ) : (
                <button
                  onClick={() => handleDelete(Array.from(selectedIds))}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 transition-colors text-xs font-bold"
                >
                  <Trash2 size={14} /> Delete
                </button>
              )}
              <button onClick={() => setSelectedIds(new Set())} className="p-1.5 text-slate-400 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}