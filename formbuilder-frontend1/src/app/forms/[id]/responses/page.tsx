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
import { Download, ArrowLeft, Plus, Trash2, Edit, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, ArrowUp, ArrowDown, CheckSquare, Square, X, FileSpreadsheet, FileJson, FileText, ChevronDown, Eye, Filter, RefreshCcw, Settings2, LayoutGrid, List } from 'lucide-react';
import { deleteSubmission, deleteSubmissionsBulk, getSubmissions } from '@/services/api';
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
      const formRes = await fetch(`http://localhost:8080/api/forms/${formId}`, { 
        credentials: 'include',
        signal 
      });
      
      if (formRes.status === 401) {
        router.push('/login');
        return;
      }
      if (!formRes.ok) throw new Error('Failed to fetch form data');

      const formData = await formRes.json();
      setFormTitle(formData.title);
      setPublicToken(formData.publicShareToken);

      const activeVersion = formData.versions?.[0];
      const currentFields = activeVersion?.fields || [];
      const currentFieldNames = new Set(currentFields.map((f: any) => f.columnName));

      // 2. Fetch Submissions with Pagination, Sorting, and Filtering
      const response = await getSubmissions(
        formId,
        currentPage - 1, // Backend is 0-indexed
        pageSize,
        sortConfig.key || 'submitted_at',
        sortConfig.direction?.toUpperCase() || 'DESC',
        { ...debouncedColumnFilters, ...(debouncedSearchTerm ? { 'q': debouncedSearchTerm } : {}) }
      );

      setData(response.content);
      setTotalElements(response.totalElements);
      setTotalPages(response.totalPages);

      // 3. Build Headers (Only if empty or formId changes)
      if (headers.length === 0) {
        let ghostHeaders: FormHeader[] = [];
        if (response.content.length > 0) {
          const allDbKeys = Object.keys(response.content[0]);
          const ghostKeys = allDbKeys.filter(key =>
            key !== 'submission_id' && key !== 'submitted_at' && key !== 'submission_status' && !currentFieldNames.has(key)
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

        setHeaders([...standardHeaders, ...formHeaders, ...ghostHeaders]);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      console.error("Error loading responses:", error);
      toast.error("Failed to load response data");
    } finally {
      setIsFetching(false);
      setIsInitialLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [formId, currentPage, pageSize, sortConfig, debouncedColumnFilters, debouncedSearchTerm]);

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
    if (value === null || value === undefined) return <span className="text-[var(--text-faint)] italic">—</span>;

    if (type === 'FILE' && value) {
      return (
        <a
          href={`http://localhost:8080${value}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors hover:bg-[var(--accent)] hover:text-white"
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
                <span key={i} className="px-1.5 py-0.5 rounded bg-[var(--bg-muted)] text-[10px] border border-[var(--border)]">
                  {String(p)}
                </span>
              ))}
              {parsed.length > 2 && <span className="text-[10px] text-[var(--text-faint)]">+{parsed.length - 2}</span>}
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

  const prepareExportData = () => {
    // Use data consistently as it represents the filtered set from server
    if (data.length === 0) return [];
    
    return data.map((row, idx) => {
      const exportRow: any = {};
      headers.forEach(header => {
        if (header.key === 'serial_no') {
          exportRow[header.label] = idx + 1;
        } else if (header.key === 'submitted_at') {
          exportRow[header.label] = new Date(row[header.key]).toLocaleString();
        } else {
          exportRow[header.label] = row[header.key] || '';
        }
      });
      return exportRow;
    });
  };

  const downloadCSV = () => {
    const exportRows = prepareExportData();
    if (exportRows.length === 0) {
      toast.info("No data available to export");
      return;
    }
    const csvHeaders = headers.map(h => h.label).join(',');
    const csvContent = exportRows.map(row =>
      headers.map(h => {
        const val = row[h.label];
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',')
    ).join('\n');

    const blob = new Blob([csvHeaders + '\n' + csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${formTitle.replace(/\s+/g, '_')}_responses.csv`;
    a.click();
    setShowExportMenu(false);
  };

  const downloadXLSX = () => {
    const exportRows = prepareExportData();
    if (exportRows.length === 0) {
      toast.info("No data available to export");
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Responses");
    XLSX.writeFile(workbook, `${formTitle.replace(/\s+/g, '_')}_responses.xlsx`);
    setShowExportMenu(false);
  };

  const downloadPDF = () => {
    const exportRows = prepareExportData();
    if (exportRows.length === 0) {
      toast.info("No data available to export");
      return;
    }
    const doc = new jsPDF('landscape');
    const tableHeaders = headers.map(h => h.label);
    const tableData = exportRows.map(row => headers.map(h => row[h.label]));

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

    toast(`Delete ${count} response${count > 1 ? 's' : ''} permanently?`, {
      description: 'This action cannot be undone.',
      action: {
        label: 'Delete',
        onClick: async () => {
          try {
            if (isBulk) {
              await deleteSubmissionsBulk(formId, idOrIds as string[]);
              setData((prevData) => prevData.filter(row => !idOrIds.includes(row.submission_id)));
              setSelectedIds(new Set());
            } else {
              await deleteSubmission(formId, idOrIds as string);
              setData((prevData) => prevData.filter(row => row.submission_id !== idOrIds));
              const newSelected = new Set(selectedIds);
              newSelected.delete(idOrIds as string);
              setSelectedIds(newSelected);
            }
            toast.success(`${count} response${count > 1 ? 's' : ''} deleted`);
          } catch (err) {
            toast.error("Failed to delete response");
          }
        }
      },
      cancel: { label: 'Cancel', onClick: () => { } }
    });
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
              className="p-2 rounded-xl transition-all hover:bg-[var(--bg-muted)] group shrink-0"
              style={{ color: 'var(--text-muted)' }} 
            >
              <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5 overflow-hidden">
                <span className="hidden sm:inline text-[8px] font-black uppercase tracking-[0.2em] text-[var(--text-faint)] whitespace-nowrap">Responses Page</span>
                <span className="hidden sm:inline text-[var(--border)] font-light">/</span>
                <h1 className="text-base sm:text-xl font-extrabold tracking-tight truncate" style={{ color: 'var(--text-primary)' }}>{formTitle}</h1>
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
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6">
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
              className="w-full pl-12 pr-4 py-3 rounded-xl text-sm border-0 bg-slate-50 transition-all focus:ring-2 focus:ring-blue-500/20 focus:bg-white"
              style={{ color: '#0f172a' }}
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Advanced Filters */}
            <div className="relative">
              <button
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                  Object.keys(columnFilters).length > 0 || showFilterPanel ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-600'
                } hover:border-blue-400`}
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
                  <div className="absolute right-0 mt-3 w-80 rounded-2xl shadow-2xl border bg-white border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-6">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Advanced Filtering</span>
                        <span className="text-[9px] text-slate-400">Match specific column values</span>
                      </div>
                      <button 
                        onClick={() => { setColumnFilters({}); setCurrentPage(1); }} 
                        className="text-[10px] font-bold text-blue-600 hover:underline"
                      >
                        Reset
                      </button>
                    </div>
                    <div className="max-h-80 overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                      {headers.filter(h => h.key !== 'serial_no').map(header => (
                        <div key={header.key} className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{header.label}</label>
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
                            className="w-full px-3 py-2 rounded-lg text-xs border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* View Toggle - Hidden on mobile, force GRID */}
            <div className="hidden sm:flex bg-slate-100 p-1 rounded-xl border border-slate-200 mr-2 shadow-inner">
              <button
                onClick={() => setViewMode('TABLE')}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'TABLE' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}
                title="Table View"
              >
                <List size={18} />
              </button>
              <button
                onClick={() => setViewMode('GRID')}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'GRID' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}
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
                  showColumnConfig ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600'
                } hover:border-slate-300`}
              >
                <Settings2 size={16} /> 
                <span className="hidden lg:inline">Columns</span>
              </button>

              {showColumnConfig && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowColumnConfig(false)} />
                  <div className="absolute right-0 mt-3 w-72 rounded-2xl shadow-2xl border bg-white border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-6">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Layout Settings</span>
                      <button onClick={() => setVisibleColumns(new Set(headers.map(h => h.key)))} className="text-[10px] font-bold text-blue-600 hover:underline">Reset</button>
                    </div>
                    <div className="max-h-80 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                      {headers.map(header => (
                        <label key={header.key} className="flex items-center justify-between cursor-pointer group">
                          <span className="text-xs font-medium text-slate-700 group-hover:text-blue-600 transition-colors">{header.label}</span>
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-all"
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
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-200 transition-all hover:border-slate-300"
                >
                  <Download size={16} /> 
                  <span className="hidden lg:inline">Export</span>
                  <ChevronDown size={14} className={`transition-transform duration-200 ${showExportMenu ? 'rotate-180' : ''}`} />
                </button>

                {showExportMenu && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setShowExportMenu(false)} />
                    <div className="absolute right-0 mt-3 w-56 rounded-2xl shadow-2xl border bg-white border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                      <div className="p-2">
                         <button onClick={downloadXLSX} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-colors hover:bg-slate-50 text-slate-700">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center"><FileSpreadsheet size={16} /></div> Excel (.xlsx)
                        </button>
                        <button onClick={downloadCSV} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-colors hover:bg-slate-50 text-slate-700">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><FileText size={16} /></div> CSV (.csv)
                        </button>
                        <button onClick={downloadPDF} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-colors hover:bg-slate-50 text-slate-700">
                          <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center"><FileText size={16} /></div> PDF (.pdf)
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
                <div key={key} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold shadow-sm">
                  <Filter size={12} className="text-slate-400" />
                  <span className="text-slate-500 font-medium">{header?.label || key}:</span>
                  <span className="text-slate-900">{value}</span>
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

          {(viewMode === 'TABLE' && !globalThis.window?.innerWidth || globalThis.window?.innerWidth >= 640) ? (
          <div className="rounded-3xl border shadow-sm overflow-hidden" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full border-separate border-spacing-0">
                <thead>
                  <tr className="bg-[var(--bg-muted)]/50">
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
                        className="sticky top-0 px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest border-b cursor-pointer hover:bg-[var(--bg-hover)] transition-colors z-20 bg-inherit"
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
                <tbody className="divide-y divide-slate-100">
                  {paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan={visibleColumns.size + 2} className="px-6 py-24 text-center">
                        <div className="flex flex-col items-center justify-center space-y-4">
                          <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-300">
                            <Search size={32} />
                          </div>
                          <p className="text-sm font-medium text-slate-500">
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
                          className="group/row transition-colors hover:bg-slate-50/50"
                          style={{ background: isSelected ? '#f1f5f9' : 'white' }} 
                        >
                          <td className="px-6 py-4 border-b border-slate-100">
                            <button
                              onClick={() => toggleSelect(row.submission_id)}
                              className="p-2 rounded-lg transition-all"
                              style={{ color: isSelected ? '#2563eb' : '#cbd5e1' }}
                            >
                              {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                            </button>
                          </td>
                          {headers.filter(h => visibleColumns.has(h.key)).map((header) => (
                            <td
                              key={`${row.submission_id}-${header.key}`}
                              className="px-6 py-4 text-sm border-b border-slate-100 whitespace-nowrap"
                              style={{ color: '#334155' }} 
                            >
                              {header.key === 'serial_no' ? (
                                <span className="font-mono text-slate-400">{globalIdx + 1}</span>
                              ) : header.key === 'submitted_at' ? (
                                <span className="text-slate-500">{new Date(row[header.key]).toLocaleString()}</span>
                              ) : header.key === 'submission_status' ? (
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                    row[header.key] === 'DRAFT' 
                                      ? 'bg-slate-100 text-slate-600 border-slate-200' 
                                      : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                  }`}
                                >
                                  {row[header.key] || 'FINAL'}
                                </span>
                              ) : (
                                <div className="max-w-[200px] truncate">
                                  {formatCellValue(row[header.key], header.type)}
                                </div>
                              )}
                            </td>
                          ))}
                          <td className="px-6 py-4 border-b border-slate-100 text-right sticky right-0 z-10 bg-inherit">
                            <div className="flex justify-end gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                              <button
                                onClick={() => {
                                  setSelectedSubmission(row);
                                  setIsDrawerOpen(true);
                                }}
                                className="p-2 rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-all"
                                title="View Details"
                              >
                                <Eye size={16} />
                              </button>
                              <a
                                href={`/f/${publicToken}?edit=${row.submission_id}`}
                                className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
                                title="Edit"
                              >
                                <Edit size={16} />
                              </a>
                              <button
                                onClick={() => handleDelete(row.submission_id)}
                                className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
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
              <div className="bg-white rounded-3xl border border-dashed border-slate-300 py-20 text-center">
                <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center mx-auto mb-4 text-slate-300">
                  <Search size={32} />
                </div>
                <p className="text-sm font-medium text-slate-500">
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
                      className={`group relative p-6 rounded-[2rem] border transition-all duration-300 ${
                        isSelected ? 'bg-blue-50/50 border-blue-200 shadow-md translate-y-[-4px]' : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-xl hover:translate-y-[-4px]'
                      }`}
                    >
                      {/* Checkbox Overlay */}
                      <button
                        onClick={() => toggleSelect(row.submission_id)}
                        className={`absolute top-6 left-6 p-2 rounded-xl transition-all z-10 ${
                          isSelected ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-50 text-slate-300 opacity-0 group-hover:opacity-100 border border-slate-100'
                        }`}
                      >
                        {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                      </button>

                      <div className="flex justify-end mb-6">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          row.submission_status === 'DRAFT' 
                            ? 'bg-amber-50 text-amber-600 border-amber-100' 
                            : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        }`}>
                          {row.submission_status || 'FINAL'}
                        </span>
                      </div>
                      
                      <div className="space-y-5 mb-8">
                        {headers.filter(h => visibleColumns.has(h.key) && h.key !== 'submission_status').slice(0, 5).map(header => (
                          <div key={header.key} className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{header.label}</label>
                            <p className="text-sm font-bold text-slate-700 truncate group-hover:text-blue-600 transition-colors">
                              {header.key === 'serial_no' ? globalIdx + 1 : header.key === 'submitted_at' ? new Date(row[header.key]).toLocaleDateString() : formatCellValue(row[header.key], header.type)}
                            </p>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Status</span>
                          <span className="text-xs text-slate-600 font-medium">
                            {row.submission_status === 'DRAFT' ? 'In Progress' : 'Completed'}
                          </span>
                        </div>
                        <div className="flex gap-1.5">
                           <button 
                            onClick={() => { setSelectedSubmission(row); setIsDrawerOpen(true); }} 
                            className="p-2.5 rounded-2xl bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-all active:scale-90"
                            title="View Details"
                           >
                            <Eye size={18} />
                           </button>
                           <a 
                            href={`/f/${publicToken}?edit=${row.submission_id}`} 
                            className="p-2.5 rounded-2xl bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all active:scale-90"
                            title="Edit"
                           >
                            <Edit size={18} />
                           </a>
                           <button 
                            onClick={() => handleDelete(row.submission_id)} 
                            className="p-2.5 rounded-2xl bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all active:scale-90"
                            title="Delete"
                           >
                            <Trash2 size={18} />
                           </button>
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

        {/* ── SaaS Pagination ── */}
        {totalElements > 0 && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mt-8 px-8 py-5 bg-slate-50/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Per Page</span>
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                  className="bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500/20 outline-none"
                >
                  {[10, 20, 50, 100].map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                {totalElements} records
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-2 rounded-xl border border-slate-200 bg-white text-slate-400 disabled:opacity-30 transition-all hover:bg-slate-50"
              >
                <ChevronsLeft size={16} />
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-xl border border-slate-200 bg-white text-slate-400 disabled:opacity-30 transition-all hover:bg-slate-50"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="text-slate-900 font-bold">{currentPage}</span>
                <span className="text-slate-300">/</span>
                <span className="text-slate-500">{totalPages || 1}</span>
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-2 rounded-xl border border-slate-200 bg-white text-slate-400 disabled:opacity-30 transition-all hover:bg-slate-50"
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-2 rounded-xl border border-slate-200 bg-white text-slate-400 disabled:opacity-30 transition-all hover:bg-slate-50"
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
              <button
                onClick={() => handleDelete(Array.from(selectedIds))}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 transition-colors text-xs font-bold"
              >
                <Trash2 size={14} /> Delete
              </button>
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