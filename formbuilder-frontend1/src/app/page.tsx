'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, FileText, Edit, Eye, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

// Optional: Adjust this interface if your API returns different fields
interface FormSummary {
  id: number;
  title: string;
  description: string;
  status: string;
}

export default function Dashboard() {
  const [forms, setForms] = useState<FormSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      const res = await fetch('http://localhost:8080/api/forms');
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setForms(data);
    } catch (error) {
      toast.error("Failed to load forms");
    } finally {
      setLoading(false);
    }
  };

const handleDelete = (id: number) => {
    // Trigger a Sonner toast with an action button
    toast('Archive this form?', {
      description: 'It will be moved to your archives.',
      action: {
        label: 'Archive',
        onClick: async () => {
          try {
            await fetch(`http://localhost:8080/api/forms/${id}`, { method: 'DELETE' });
            toast.success("Form archived");
            // Use functional state update to ensure we have the latest forms array
            setForms((prevForms) => prevForms.filter(f => f.id !== id));
          } catch (error) {
            toast.error("Failed to archive form");
          }
        }
      },
      cancel: {
        label: 'Cancel',
        onClick: () => {} // Does nothing, just closes the toast
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Your Forms</h1>
            <p className="text-gray-500 mt-1">Manage and track your dynamic forms</p>
          </div>
          <Link
            href="/builder"
            className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-lg hover:bg-gray-800 transition-all shadow-sm"
          >
            <Plus size={20} />
            Create New Form
          </Link>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-20 text-gray-500">Loading your workspace...</div>
        ) : forms.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-16 text-center">
            <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText size={32} />
            </div>
            <h3 className="text-lg font-medium text-gray-900">No forms created yet</h3>
            <p className="text-gray-500 mt-2 mb-6 max-w-sm mx-auto">
              Get started by creating your first dynamic form. It only takes a few seconds.
            </p>
            <Link
              href="/builder"
              className="text-blue-600 font-medium hover:text-blue-800"
            >
              Start Building &rarr;
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {forms.map((form) => (
              <div key={form.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow flex flex-col h-full">

                {/* Card Header & Body */}
                <div className="p-6 flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border
                      ${form.status === 'PUBLISHED'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                      }`}
                    >
                      {form.status || 'DRAFT'}
                    </span>
                    <span className="text-xs text-gray-400">
                      ID: {form.id}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 mb-2 truncate">
                    {form.title}
                  </h3>
                  <p className="text-sm text-gray-500 line-clamp-2">
                    {form.description || "No description provided."}
                  </p>
                </div>

                {/* Card Footer / Actions */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 rounded-b-xl flex justify-between items-center">
                  <div className="flex gap-1">
                    {/* 1. Edit Button (Always Visible) */}
                    <Link
                      href={`/builder?id=${form.id}`} 
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit Form"
                    >
                      <Edit size={18} />
                    </Link>

                    {/* Show View and Responses ONLY if PUBLISHED */}
                    {form.status === 'PUBLISHED' && (
                      <>
                        <Link
                          href={`/forms/${form.id}`}
                          target="_blank"
                          className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="View Public Form"
                        >
                          <Eye size={18} />
                        </Link>

                        <Link
                          href={`/forms/${form.id}/responses`}
                          className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="View Responses"
                        >
                          <FileText size={18} />
                        </Link>
                      </>
                    )}
                  </div>

                  {/* 4. Delete/Archive Button */}
                  <button
                    onClick={() => handleDelete(form.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Archive Form"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 