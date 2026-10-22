"use client";

import React, { useEffect, useState, useCallback } from "react";
import api from "@/lib/api-client";
import { Alert } from "@/components/ui/Alert";
import { StatusBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  Plus,
  Filter,
  Edit2,
  Trash2,
  RefreshCw,
  Clock,
  CheckCircle,
} from "lucide-react";

interface Term {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  academicYearId: number;
  status: "UPCOMING" | "ACTIVE" | "COMPLETED";
  isCurrent: boolean;
  academicYear: {
    id: number;
    name: string;
    isCurrent: boolean;
  };
}

interface AcademicYearOption {
  id: number;
  name: string;
  isCurrent: boolean;
}

export default function TermsPage() {
  const [terms, setTerms] = useState<Term[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [yearFilter, setYearFilter] = useState("");

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<Term | null>(null);
  const [deletingTerm, setDeletingTerm] = useState<Term | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    name: "Term 1",
    startDate: "",
    endDate: "",
    academicYearId: "",
    status: "UPCOMING",
    isCurrent: false,
  });
  const [formErrors, setFormErrors] = useState<Array<{ field?: string; message: string }>>([]);

  const fetchTerms = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<Term[]>("/api/terms", {
        academicYearId: yearFilter || undefined,
      });
      setTerms(res.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load terms.");
    } finally {
      setLoading(false);
    }
  }, [yearFilter]);

  const fetchYears = async () => {
    try {
      const res = await api.get<AcademicYearOption[]>("/api/academic-years");
      setAcademicYears(res.data || []);
    } catch {
      // fallback
    }
  };

  useEffect(() => {
    fetchTerms();
    fetchYears();
  }, [fetchTerms]);

  const openCreateModal = () => {
    setEditingTerm(null);
    const activeYear = academicYears.find((ay) => ay.isCurrent) || academicYears[0];
    setFormData({
      name: "Term 1",
      startDate: "",
      endDate: "",
      academicYearId: activeYear ? String(activeYear.id) : "",
      status: "UPCOMING",
      isCurrent: false,
    });
    setFormErrors([]);
    setIsFormOpen(true);
  };

  const openEditModal = (t: Term) => {
    setEditingTerm(t);
    setFormData({
      name: t.name,
      startDate: t.startDate.split("T")[0],
      endDate: t.endDate.split("T")[0],
      academicYearId: String(t.academicYearId),
      status: t.status,
      isCurrent: t.isCurrent,
    });
    setFormErrors([]);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormErrors([]);

    const payload = {
      name: formData.name,
      startDate: formData.startDate,
      endDate: formData.endDate,
      academicYearId: Number(formData.academicYearId),
      status: formData.status,
      isCurrent: formData.isCurrent,
    };

    try {
      if (editingTerm) {
        await api.patch(`/api/terms/${editingTerm.id}`, payload);
        setFeedback({ type: "success", message: `Term ${formData.name} updated successfully.` });
      } else {
        await api.post("/api/terms", payload);
        setFeedback({ type: "success", message: `Term ${formData.name} created successfully.` });
      }
      setIsFormOpen(false);
      fetchTerms();
    } catch (err: any) {
      if (err.errors) {
        setFormErrors(err.errors);
      } else {
        setFormErrors([{ message: err.message || "Failed to save term." }]);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingTerm) return;
    setSubmitting(true);
    try {
      await api.delete(`/api/terms/${deletingTerm.id}`);
      setFeedback({ type: "success", message: "Term deleted successfully." });
      setDeletingTerm(null);
      fetchTerms();
    } catch (err: any) {
      setError(err.message || "Failed to delete term.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Term Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage terms, trimester dates, and active teaching periods within each academic year
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Term</span>
        </button>
      </div>

      {feedback && (
        <Alert type={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />
      )}
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Filter className="w-3.5 h-3.5" />
            <span>Academic Year:</span>
          </div>

          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Academic Years</option>
            {academicYears.map((ay) => (
              <option key={ay.id} value={ay.id}>
                {ay.name} {ay.isCurrent ? "(Current Year)" : ""}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={fetchTerms}
          className="p-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Term Name</th>
                <th className="px-4 py-3">Academic Session</th>
                <th className="px-4 py-3">Start Date</th>
                <th className="px-4 py-3">End Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && terms.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    <span className="inline-block w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2 align-middle" />
                    Loading terms...
                  </td>
                </tr>
              ) : terms.length > 0 ? (
                terms.map((term) => (
                  <tr key={term.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900 flex items-center gap-2">
                      <span>{term.name}</span>
                      {term.isCurrent && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-semibold rounded-full">
                          <CheckCircle className="w-3 h-3 text-blue-600" />
                          Current Term
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs font-medium text-slate-800">
                      {term.academicYear.name}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600">
                      {new Date(term.startDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600">
                      {new Date(term.endDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={term.status} />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(term)}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded"
                          title="Edit term"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingTerm(term)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded"
                          title="Delete term"
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
                    No terms found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingTerm ? "Edit Academic Term" : "Create New Term"}
        description="Term name, academic year, and calendar duration"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formErrors.length > 0 && (
            <Alert type="error" message="Please review form errors:" errors={formErrors} />
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Academic Year *</label>
            <select
              required
              value={formData.academicYearId}
              onChange={(e) => setFormData({ ...formData, academicYearId: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
            >
              <option value="">-- Select Year --</option>
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>
                  {ay.name} {ay.isCurrent ? "(Current Year)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Term Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Term 1, Term 2, Trimester 3"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Term Start Date *</label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Term End Date *</label>
              <input
                type="date"
                required
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
              >
                <option value="UPCOMING">Upcoming</option>
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>

            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isCurrent}
                  onChange={(e) => setFormData({ ...formData, isCurrent: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <span className="text-xs font-semibold text-slate-800">Set as Current Term</span>
              </label>
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
              {submitting ? "Saving..." : editingTerm ? "Save Changes" : "Create Term"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingTerm}
        onClose={() => setDeletingTerm(null)}
        onConfirm={handleDelete}
        title="Delete Term"
        message={`Are you sure you want to delete ${deletingTerm?.name}?`}
        confirmLabel="Delete Term"
        isLoading={submitting}
      />
    </div>
  );
}
