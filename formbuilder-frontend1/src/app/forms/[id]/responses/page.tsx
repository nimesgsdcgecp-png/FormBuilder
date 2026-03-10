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
import { Download, ArrowLeft, Plus, Trash2, Edit, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, ArrowUp, ArrowDown, CheckSquare, Square, X, FileSpreadsheet, FileJson, FileText, ChevronDown } from 'lucide-react';
import { deleteSubmission, deleteSubmissionsBulk } from '@/services/api';
import { toast } from 'sonner';
import ThemeToggle from '@/components/ThemeToggle';
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

  const [headers, setHeaders] = useState<FormHeader[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formTitle, setFormTitle] = useState('');
  const [publicToken, setPublicToken] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Sorting, Filtering & Pagination States
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' | null }>({ key: 'submitted_at', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!formId) return;

    const fetchData = async () => {
      try {
        const formRes = await fetch(`http://localhost:8080/api/forms/${formId}`, { credentials: 'include' });
        if (formRes.status === 401) {
          router.push('/login');
          return;
        }
        if (!formRes.ok) throw new Error('Failed to fetch form data');

        const formData = await formRes.json();
        setFormTitle(formData.title);
        setPublicToken(formData.publicShareToken);

        const activeVersion = formData.versions?.[0];
        if (!activeVersion) {
          setLoading(false);
          return;
        }

        const currentFields = activeVersion.fields || [];
        const currentFieldNames = new Set(currentFields.map((f: any) => f.columnName));

        const dataRes = await fetch(`http://localhost:8080/api/forms/${formId}/submissions`, { credentials: 'include' });
        if (dataRes.status === 401) {
          router.push('/login');
          return;
        }
        if (!dataRes.ok) throw new Error('Failed to fetch submissions');

        const dataRows = await dataRes.json();
        setData(dataRows);

        let ghostHeaders: FormHeader[] = [];
        if (dataRows.length > 0) {
          const allDbKeys = Object.keys(dataRows[0]);
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
      } catch (error) {
        console.error("Error loading responses:", error);
        toast.error("Failed to load response data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [formId, router]);

  const formatLabel = (key: string) =>
    key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  // --- Export Logic ---

  const prepareExportData = () => {
    const exportData = sortedData.length > 0 ? sortedData : data;
    return exportData.map((row, idx) => {
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
    if (data.length === 0) return;
    const exportRows = prepareExportData();
    const csvHeaders = headers.map(h => h.label).join(',');
    const csvContent = exportRows.map(row =>
      headers.map(h => `"${row[h.label]}"`).join(',')
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
    if (data.length === 0) return;
    const exportRows = prepareExportData();
    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Responses");
    XLSX.writeFile(workbook, `${formTitle.replace(/\s+/g, '_')}_responses.xlsx`);
    setShowExportMenu(false);
  };

  const downloadPDF = () => {
    if (data.length === 0) return;
    const doc = new jsPDF('landscape');
    const exportRows = prepareExportData();
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

  // 1. Filter
  const filteredData = data.filter(row => {
    if (!searchTerm) return true;
    return Object.values(row).some(val =>
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // 2. Sort
  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortConfig.key || !sortConfig.direction) return 0;

    const aVal = a[sortConfig.key];
    const bVal = b[sortConfig.key];

    if (aVal === bVal) return 0;

    const direction = sortConfig.direction === 'asc' ? 1 : -1;

    if (sortConfig.key === 'submitted_at') {
      return (new Date(aVal).getTime() - new Date(bVal).getTime()) * direction;
    }

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return (aVal - bVal) * direction;
    }

    return String(aVal).localeCompare(String(bVal)) * direction;
  });

  // 3. Paginate
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const paginatedData = sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' | null = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = null;
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key || !sortConfig.direction) return <ArrowUpDown size={14} className="opacity-30" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-muted)' }}>
        Loading data...
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      {/* ── Header ── */}
      <header
        className="sticky top-0 z-10 border-b"
        style={{ background: 'var(--header-bg)', borderColor: 'var(--header-border)' }}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="p-2 rounded-lg transition-all"
              style={{ color: 'var(--text-muted)' }}
            >
              <ArrowLeft size={18} />
            </button>
            <div className="w-px h-5" style={{ background: 'var(--border)' }} />
            <div>
              <h1 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{formTitle}</h1>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{filteredData.length} records found</p>
            </div>
          </div>

          <div className="flex-1 max-w-md mx-8">
            <div className="relative group">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: searchTerm ? 'var(--accent)' : 'var(--text-faint)' }}
              />
              <input
                type="text"
                placeholder="Search responses..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 rounded-xl text-sm border transition-all focus:outline-none focus:ring-2"
                style={{
                  background: 'var(--bg-muted)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <a
              href={`/f/${publicToken}`}
              target="_blank"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white transition-all hover:brightness-110 active:scale-95"
              style={{ background: '#3b82f6' }}
            >
              <Plus size={14} /> New
            </a>

            {/* Export Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white transition-all hover:brightness-110 active:scale-95"
                style={{ background: '#10b981' }}
              >
                <Download size={14} /> Export <ChevronDown size={14} className={`transition-transform duration-200 ${showExportMenu ? 'rotate-180' : ''}`} />
              </button>

              {showExportMenu && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowExportMenu(false)} />
                  <div
                    className="absolute right-0 mt-2 w-48 rounded-xl shadow-2xl border z-30 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                    style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
                  >
                    <button
                      onClick={downloadXLSX}
                      className="w-full flex items-center gap-3 px-4 py-3 text-xs font-medium transition-colors hover:bg-[var(--bg-muted)]"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <FileSpreadsheet size={16} className="text-green-500" /> Excel (.xlsx)
                    </button>
                    <button
                      onClick={downloadCSV}
                      className="w-full flex items-center gap-3 px-4 py-3 text-xs font-medium transition-colors hover:bg-[var(--bg-muted)]"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <FileText size={16} className="text-blue-500" /> CSV (.csv)
                    </button>
                    <button
                      onClick={downloadPDF}
                      className="w-full flex items-center gap-3 px-4 py-3 text-xs font-medium transition-colors hover:bg-[var(--bg-muted)]"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <FileText size={16} className="text-red-500" /> PDF (.pdf)
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Data Table ── */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div
          className="rounded-xl border overflow-hidden"
          style={{
            background: 'var(--card-bg)',
            borderColor: 'var(--card-border)',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          <div className="overflow-x-auto">
            <table className="min-w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-muted)', borderBottom: '1px solid var(--border)' }}>
                  <th className="sticky top-0 px-5 py-3 text-left w-10">
                    <button
                      onClick={toggleSelectAll}
                      className="p-1 rounded transition-colors group"
                      style={{ color: selectedIds.size > 0 ? 'var(--accent)' : 'var(--text-faint)' }}
                    >
                      {selectedIds.size > 0 && selectedIds.size === paginatedData.length ? (
                        <CheckSquare size={16} />
                      ) : (
                        <Square size={16} className="group-hover:text-primary" />
                      )}
                    </button>
                  </th>
                  {headers.map((header) => (
                    <th
                      key={header.key}
                      onClick={() => handleSort(header.key)}
                      className="sticky top-0 px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider whitespace-nowrap cursor-pointer group"
                      style={{ color: 'var(--text-faint)', background: 'var(--bg-muted)', borderBottom: '1px solid var(--border)' }}
                    >
                      <div className="flex items-center gap-1.5 transition-colors group-hover:text-primary">
                        {header.label}
                        {getSortIcon(header.key)}
                      </div>
                    </th>
                  ))}
                  <th className="sticky top-0 px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-faint)', background: 'var(--bg-muted)', borderBottom: '1px solid var(--border)' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={headers.length + 2}
                      className="px-6 py-16 text-center text-sm"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {searchTerm ? 'No matches found for your search.' : 'No responses yet.'}
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((row, idx) => {
                    const globalIdx = (currentPage - 1) * pageSize + idx;
                    const isSelected = selectedIds.has(row.submission_id);
                    return (
                      <tr
                        key={row.submission_id}
                        style={{
                          borderBottom: '1px solid var(--border)',
                          background: isSelected ? 'var(--accent-subtle)' : (idx % 2 === 0 ? 'var(--card-bg)' : 'var(--bg-muted)')
                        }}
                      >
                        <td className="px-5 py-3.5">
                          <button
                            onClick={() => toggleSelect(row.submission_id)}
                            className="p-1 rounded transition-colors"
                            style={{ color: isSelected ? 'var(--accent)' : 'var(--text-faint)' }}
                          >
                            {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                          </button>
                        </td>
                        {headers.map((header) => (
                          <td
                            key={`${row.submission_id}-${header.key}`}
                            className="px-5 py-3.5 text-sm whitespace-nowrap max-w-xs truncate"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            {header.key === 'serial_no' ? (
                              <span style={{ color: 'var(--text-muted)' }}>{globalIdx + 1}</span>
                            ) : header.key === 'submitted_at' ? (
                              <span style={{ color: 'var(--text-muted)' }}>{new Date(row[header.key]).toLocaleString()}</span>
                            ) : header.key === 'submission_status' ? (
                              <span
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border"
                                style={{
                                  background: row[header.key] === 'DRAFT' ? 'rgba(107, 114, 128, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                  color: row[header.key] === 'DRAFT' ? '#6b7280' : '#10b981',
                                  borderColor: row[header.key] === 'DRAFT' ? 'rgba(107, 114, 128, 0.2)' : 'rgba(16, 185, 129, 0.2)'
                                }}
                              >
                                {row[header.key] || 'FINAL'}
                              </span>
                            ) : header.type === 'FILE' && row[header.key] ? (
                              <a
                                href={`http://localhost:8080${row[header.key]}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors"
                                style={{ background: 'var(--accent-subtle)', color: 'var(--accent)', borderColor: 'var(--accent-muted)' }}
                              >
                                <Download size={12} /> Download
                              </a>
                            ) : (
                              row[header.key]?.toString() || <span style={{ color: 'var(--text-faint)' }}>—</span>
                            )}
                          </td>
                        ))}
                        <td className="px-5 py-3.5 whitespace-nowrap text-right">
                          <div className="flex justify-end gap-2">
                            <a
                              href={`/f/${publicToken}?edit=${row.submission_id}`}
                              className="p-1.5 rounded-lg transition-all"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              <Edit size={15} />
                            </a>
                            <button
                              onClick={() => handleDelete(row.submission_id)}
                              className="p-1.5 rounded-lg transition-all"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              <Trash2 size={15} />
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

          {/* ── Pagination Footer ── */}
          {sortedData.length > 0 && (
            <div className="px-6 py-4 border-t flex items-center justify-between gap-4 flex-wrap" style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-3">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Show:</span>
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                  className="px-2 py-1.5 rounded-lg text-xs font-medium border"
                  style={{ background: 'var(--bg-base)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                >
                  {[5, 10, 20, 50, 100].map(size => (
                    <option key={size} value={size}>{size} rows</option>
                  ))}
                </select>
                <span className="text-xs" style={{ color: 'var(--text-faint)' }}>{filteredData.length} records total</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white"
                >
                  <ChevronsLeft size={16} />
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="flex items-center px-4 py-1.5 rounded-lg border text-xs font-semibold">
                  Page {currentPage} of {totalPages || 1}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="p-1.5 rounded-lg border disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white"
                >
                  <ChevronRight size={16} />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="p-1.5 rounded-lg border disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white"
                >
                  <ChevronsRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Bulk Action Toolbar ── */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
          <div
            className="flex items-center gap-4 px-6 py-3 rounded-2xl shadow-2xl border"
            style={{ background: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(51, 65, 85, 0.5)', color: 'white' }}
          >
            <div className="flex items-center gap-3 pr-4 border-r border-slate-700">
              <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-[10px] font-bold">{selectedIds.size}</div>
              <span className="text-sm font-medium">Selected</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDelete(Array.from(selectedIds))}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 transition-colors text-xs font-bold"
              >
                <Trash2 size={14} /> Delete
              </button>
              <button onClick={() => setSelectedIds(new Set())} className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors">
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}