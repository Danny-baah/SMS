"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api-client";
import { Alert } from "@/components/ui/Alert";
import { StatusBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  Calendar,
  CheckCircle,
} from "lucide-react";

interface AcademicYear {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  status: "UPCOMING" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
  isCurrent: boolean;
  terms?: Array<{ id: number; name: string; isCurrent: boolean }>;
  _count?: {
    enrollments: number;
  };
}

export default function AcademicYearsPage() {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);
  const [deletingYear, setDeletingYear] = useState<AcademicYear | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    name: "2026/2027",
    startDate: "2026-09-01",
    endDate: "2027-07-20",
    status: "ACTIVE",
    isCurrent: true,
  });
  const [formErrors, setFormErrors] = useState<Array<{ field?: string; message: string }>>([]);

  const fetchYears = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<AcademicYear[]>("/api/academic-years");
      setAcademicYears(res.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load academic years.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchYears();
  }, []);

  const openCreateModal = () => {
    setEditingYear(null);
    setFormData({
      name: "",
      startDate: "",
      endDate: "",
      status: "UPCOMING",
      isCurrent: false,
    });
    setFormErrors([]);
    setIsFormOpen(true);
  };

  const openEditModal = (ay: AcademicYear) => {
    setEditingYear(ay);
    setFormData({
      name: ay.name,
      startDate: ay.startDate.split("T")[0],
      endDate: ay.endDate.split("T")[0],
      status: ay.status,
      isCurrent: ay.isCurrent,
    });
    setFormErrors([]);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormErrors([]);

    try {
      if (editingYear) {
        await api.patch(`/api/academic-years/${editingYear.id}`, formData);
        setFeedback({ type: "success", message: `Academic year ${formData.name} updated successfully.` });
      } else {
        await api.post("/api/academic-years", formData);
        setFeedback({ type: "success", message: `Academic year ${formData.name} created successfully.` });
      }
      setIsFormOpen(false);
      fetchYears();
    } catch (err: any) {
      if (err.errors) {
        setFormErrors(err.errors);
      } else {
        setFormErrors([{ message: err.message || "Failed to save academic year." }]);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingYear) return;
    setSubmitting(true);
    try {
      await api.delete(`/api/academic-years/${deletingYear.id}`);
      setFeedback({ type: "success", message: "Academic year deleted successfully." });
      setDeletingYear(null);
      fetchYears();
    } catch (err: any) {
      setError(err.message || "Failed to delete academic year.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Academic Year Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure academic session cycles, calendar date boundaries, and active school years
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Academic Year</span>
        </button>
      </div>

      {feedback && (
        <Alert type={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />
      )}
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Academic Session</th>
                <th className="px-4 py-3">Start Date</th>
                <th className="px-4 py-3">End Date</th>
                <th className="px-4 py-3">Associated Terms</th>
                <th className="px-4 py-3 text-right">Total Enrollments</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && academicYears.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    <span className="inline-block w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2 align-middle" />
                    Loading academic years...
                  </td>
                </tr>
              ) : academicYears.length > 0 ? (
                academicYears.map((ay) => (
                  <tr key={ay.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900 flex items-center gap-2">
                      <span>{ay.name}</span>
                      {ay.isCurrent && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-semibold rounded-full">
                          <CheckCircle className="w-3 h-3 text-blue-600" />
                          Current Year
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600">
                      {new Date(ay.startDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600">
                      {new Date(ay.endDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3.5 text-xs">
                      {ay.terms && ay.terms.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {ay.terms.map((t) => (
                            <span
                              key={t.id}
                              className={`px-2 py-0.5 rounded text-[11px] ${
                                t.isCurrent
                                  ? "bg-blue-600 text-white font-medium"
                                  : "bg-slate-100 text-slate-700 border border-slate-200"
                              }`}
                            >
                              {t.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">No terms configured</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium text-slate-800">
                      {ay._count?.enrollments || 0}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={ay.status} />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(ay)}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded"
                          title="Edit academic year"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingYear(ay)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded"
                          title="Delete academic year"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500 text-xs">
                    No academic years configured yet.
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
        title={editingYear ? "Edit Academic Year" : "Create Academic Year"}
        description="Session name and calendar date range"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formErrors.length > 0 && (
            <Alert type="error" message="Please review form errors:" errors={formErrors} />
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Session Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. 2026/2027"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Session Start Date *</label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Session End Date *</label>
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
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
              >
                <option value="UPCOMING">Upcoming</option>
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
                <option value="ARCHIVED">Archived</option>
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
                <span className="text-xs font-semibold text-slate-800">Set as Current School Year</span>
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
              {submitting ? "Saving..." : editingYear ? "Save Changes" : "Create Session"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingYear}
        onClose={() => setDeletingYear(null)}
        onConfirm={handleDelete}
        title="Delete Academic Year"
        message={`Are you sure you want to delete ${deletingYear?.name}? Academic years with active pupil enrollments cannot be deleted.`}
        confirmLabel="Delete Academic Year"
        isLoading={submitting}
      />
    </div>
  );
}
