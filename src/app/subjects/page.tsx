"use client";

import React, { useEffect, useState, useCallback } from "react";
import api from "@/lib/api-client";
import { Alert } from "@/components/ui/Alert";
import { StatusBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  RefreshCw,
  BookOpen,
} from "lucide-react";

interface Subject {
  id: number;
  subjectCode: string;
  subjectName: string;
  description: string | null;
  status: "ACTIVE" | "INACTIVE";
  classes?: Array<{
    schoolClass: { id: number; className: string; level: string };
    teacher?: { firstName: string; lastName: string } | null;
  }>;
}

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [deletingSubject, setDeletingSubject] = useState<Subject | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    subjectCode: "",
    subjectName: "",
    description: "",
    status: "ACTIVE",
  });
  const [formErrors, setFormErrors] = useState<Array<{ field?: string; message: string }>>([]);

  const fetchSubjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<Subject[]>("/api/subjects", {
        search,
        status: statusFilter || undefined,
      });
      setSubjects(res.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load subjects.");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  const openCreateModal = () => {
    setEditingSubject(null);
    setFormData({
      subjectCode: "",
      subjectName: "",
      description: "",
      status: "ACTIVE",
    });
    setFormErrors([]);
    setIsFormOpen(true);
  };

  const openEditModal = (sub: Subject) => {
    setEditingSubject(sub);
    setFormData({
      subjectCode: sub.subjectCode,
      subjectName: sub.subjectName,
      description: sub.description || "",
      status: sub.status,
    });
    setFormErrors([]);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormErrors([]);

    try {
      if (editingSubject) {
        await api.patch(`/api/subjects/${editingSubject.id}`, formData);
        setFeedback({ type: "success", message: `Subject ${formData.subjectName} updated successfully.` });
      } else {
        await api.post("/api/subjects", formData);
        setFeedback({ type: "success", message: `Subject ${formData.subjectName} added successfully.` });
      }
      setIsFormOpen(false);
      fetchSubjects();
    } catch (err: any) {
      if (err.errors) {
        setFormErrors(err.errors);
      } else {
        setFormErrors([{ message: err.message || "Failed to save subject." }]);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingSubject) return;
    setSubmitting(true);
    try {
      await api.delete(`/api/subjects/${deletingSubject.id}`);
      setFeedback({ type: "success", message: "Subject deleted successfully." });
      setDeletingSubject(null);
      fetchSubjects();
    } catch (err: any) {
      setError(err.message || "Failed to delete subject.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Subject Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Curriculum subjects, codes, descriptions, and syllabus classifications
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Subject</span>
        </button>
      </div>

      {feedback && (
        <Alert type={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />
      )}
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by code or subject name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Filter className="w-3.5 h-3.5" />
            <span>Status:</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-2.5 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>

          <button
            onClick={fetchSubjects}
            className="p-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Code</th>
                <th className="px-4 py-3">Subject Name</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Classes Assigned</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && subjects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    <span className="inline-block w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2 align-middle" />
                    Loading subjects...
                  </td>
                </tr>
              ) : subjects.length > 0 ? (
                subjects.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs font-bold text-slate-900">
                      {sub.subjectCode}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-900">{sub.subjectName}</td>
                    <td className="px-4 py-3.5 text-xs text-slate-600 max-w-xs truncate">
                      {sub.description || "—"}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600">
                      {sub.classes && sub.classes.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {sub.classes.map((c, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[11px] text-slate-800"
                            >
                              {c.schoolClass.className}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">None</span>
                      )}
                    </td>
                    <td className="px-3 py-3.5">
                      <StatusBadge status={sub.status} />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(sub)}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded"
                          title="Edit subject"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingSubject(sub)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded"
                          title="Delete subject"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-500 text-xs">
                    No subjects found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingSubject ? "Edit Subject" : "Create New Subject"}
        description="Core or elective curriculum course details"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formErrors.length > 0 && (
            <Alert type="error" message="Please review form errors:" errors={formErrors} />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Subject Code *</label>
              <input
                type="text"
                required
                value={formData.subjectCode}
                onChange={(e) => setFormData({ ...formData, subjectCode: e.target.value.toUpperCase() })}
                placeholder="e.g. MATH-01, ENG-01"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Subject Name *</label>
              <input
                type="text"
                required
                value={formData.subjectName}
                onChange={(e) => setFormData({ ...formData, subjectName: e.target.value })}
                placeholder="e.g. Integrated Science"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Description (Optional)</label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Course scope, objectives, or curriculum outline..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? "Saving..." : editingSubject ? "Save Changes" : "Save Subject"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingSubject}
        onClose={() => setDeletingSubject(null)}
        onConfirm={handleDelete}
        title="Delete Subject"
        message={`Are you sure you want to permanently delete subject "${deletingSubject?.subjectName}" (${deletingSubject?.subjectCode})?`}
        confirmLabel="Delete Subject"
        isLoading={submitting}
      />
    </div>
  );
}
