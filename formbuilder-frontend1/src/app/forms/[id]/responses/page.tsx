'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Download, ArrowLeft, Plus, Trash2, Edit } from 'lucide-react';
import { deleteSubmission } from '@/services/api';
import { toast } from 'sonner';

interface FormHeader {
  key: string;      // The SQL column name (e.g., "full_name")
  label: string;    // The human label (e.g., "Full Name")
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
  

  useEffect(() => {
    if (!formId) return;

    const fetchData = async () => {
      try {
        // 1. Fetch Form Definition (Current Schema)
        const formRes = await fetch(`http://localhost:8080/api/forms/${formId}`);
        const formData = await formRes.json();
        setFormTitle(formData.title);

        // Get the "Official" fields from the current version
        const currentFields = formData.versions[0].fields;
        const currentFieldNames = new Set(currentFields.map((f: any) => f.columnName));

        // 2. Fetch Actual Data (Rows from DB)
        const dataRes = await fetch(`http://localhost:8080/api/forms/${formId}/submissions`);
        const dataRows = await dataRes.json();
        setData(dataRows);

        // 3. Detect Ghost Columns
        // If we have data, look at the first row to see ALL columns in the DB
        let ghostHeaders: FormHeader[] = [];

        if (dataRows.length > 0) {
          // Get all keys from the database row
          const allDbKeys = Object.keys(dataRows[0]);

          // Filter out:
          // - System keys (submission_id, submitted_at)
          // - Keys that are currently in the form
          const ghostKeys = allDbKeys.filter(key =>
            key !== 'submission_id' &&
            key !== 'submitted_at' &&
            !currentFieldNames.has(key)
          );

          // Create headers for them
          ghostHeaders = ghostKeys.map(key => ({
            key: key,
            label: `${formatLabel(key)} (Archived)` // Add visual indicator
          }));
        }

        // 4. Build Final Headers List
        // Order: ID -> Date -> Current Fields -> Ghost Fields
        const standardHeaders = [
          { key: 'submission_id', label: 'ID' },
          { key: 'submitted_at', label: 'Date' }
        ];

        const formHeaders = currentFields.map((f: any) => ({
          key: f.columnName,
          label: f.fieldLabel,
          type: f.fieldType
        }));

        setHeaders([...standardHeaders, ...formHeaders, ...ghostHeaders]);

      } catch (error) {
        console.error("Error loading responses:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [formId]);

  // Helper to make "phone_number" look like "Phone Number"
  const formatLabel = (key: string) => {
    return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Helper to export CSV (Bonus Feature)
  const downloadCSV = () => {
    if (data.length === 0) return;

    const csvHeaders = headers.map(h => h.label).join(',');
    const csvRows = data.map(row =>
      headers.map(header => {
        const val = row[header.key];
        // Handle dates and encapsulate strings in quotes
        if (header.key === 'submitted_at') return `"${new Date(val).toLocaleString()}"`;
        return `"${val || ''}"`;
      }).join(',')
    );

    const blob = new Blob([csvHeaders + '\n' + csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${formTitle.replace(/\s+/g, '_')}_responses.csv`;
    a.click();
  };

  const handleDelete = (submissionId: string) => {
    toast('Delete this response permanently?', {
      description: 'This action cannot be undone.',
      action: {
        label: 'Delete',
        onClick: async () => {
          try {
            await deleteSubmission(formId, submissionId);
            setData((prevData) => prevData.filter(row => row.submission_id !== submissionId));
            toast.success("Response deleted");
          } catch (err) {
            toast.error("Failed to delete response");
          }
        }
      },
      cancel: {
        label: 'Cancel',
        onClick: () => {}
      }
    });
  };

  if (loading) return <div className="p-20 text-center text-gray-500">Loading data...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">

        {/* Header Section */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{formTitle}</h1>
              <p className="text-gray-500 text-sm">{data.length} responses collected</p>
            </div>
          </div>

          <div className="flex gap-2">
            {/* 1. NEW SUBMISSION BUTTON */}
            <a
              href={`/forms/${formId}`}
              target="_blank"
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
            >
              <Plus size={18} />
              New
            </a>

            {/* 2. EXPORT BUTTON */}
            <button
              onClick={downloadCSV}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 shadow-sm transition-colors"
            >
              <Download size={18} />
              Export CSV
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr className="bg-gray-50 border-b border-gray-200">
                  {headers.map((header) => (
                    <th
                      key={header.key}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                    >
                      {header.label}
                    </th>
                  ))}
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={headers.length} className="px-6 py-12 text-center text-gray-400">
                      No responses yet. Share your form to collect data!
                    </td>
                  </tr>
                ) : (
                  data.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      {headers.map((header) => (
                        <td key={`${idx}-${header.key}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">

                          {/* 1. Handle Date Field */}
                          {header.key === 'submitted_at' ? (
                            new Date(row[header.key]).toLocaleString()
                          )
                            /* 2. Handle File Upload Field */
                            : header.type === 'FILE' && row[header.key] ? (
                              <a
                                href={`http://localhost:8080${row[header.key]}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium hover:bg-blue-100 border border-blue-200 transition-colors"
                              >
                                <Download size={14} />
                                Download
                              </a>
                            )
                              /* 3. Handle Standard Text/Number Fields */
                              : (
                                row[header.key]?.toString() || '-'
                              )}

                        </td>
                      ))}
                      {/* NEW ACTIONS COLUMN */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-3">
                          <a
                            href={`/forms/${formId}?edit=${row.submission_id}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit size={16} />
                          </a>
                          <button
                            onClick={() => handleDelete(row.submission_id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}