"use client";

import React, { useEffect, useState, useCallback } from "react";
import api from "@/lib/api-client";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Eye,
  RefreshCw,
  Users,
} from "lucide-react";

interface SchoolClass {
  id: number;
  className: string;
  level: "PRESCHOOL" | "PRIMARY" | "JHS";
  section: string | null;
  capacity: number;
  classTeacherId: number | null;
  classTeacher?: {
    id: number;
    firstName: string;
    lastName: string;
    staffNumber: string;
    email: string;
  } | null;
  _count?: {
    enrollments: number;
    subjects: number;
  };
}

interface StaffOption {
  id: number;
  firstName: string;
  lastName: string;
  staffNumber: string;
  jobTitle: string;
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("");

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const [viewingClass, setViewingClass] = useState<SchoolClass | null>(null);
  const [deletingClass, setDeletingClass] = useState<SchoolClass | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    className: "",
    level: "PRIMARY",
    section: "A",
    capacity: 40,
    classTeacherId: "",
  });
  const [formErrors, setFormErrors] = useState<Array<{ field?: string; message: string }>>([]);

  const fetchClasses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<SchoolClass[]>("/api/classes", {
        search,
        level: levelFilter || undefined,
      });
      setClasses(res.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load classes.");
    } finally {
      setLoading(false);
    }
  }, [search, levelFilter]);

  const fetchStaffOptions = async () => {
    try {
      const res = await api.get<StaffOption[]>("/api/staff", { limit: 100 });
      setStaffOptions(res.data || []);
    } catch {
      // fallback
    }
  };

  useEffect(() => {
    fetchClasses();
    fetchStaffOptions();
  }, [fetchClasses]);

  const openCreateModal = () => {
    setEditingClass(null);
    setFormData({
      className: "",
      level: "PRIMARY",
      section: "A",
      capacity: 40,
      classTeacherId: "",
    });
    setFormErrors([]);
    setIsFormOpen(true);
  };

  const openEditModal = (c: SchoolClass) => {
    setEditingClass(c);
    setFormData({
      className: c.className,
      level: c.level,
      section: c.section || "",
      capacity: c.capacity,
      classTeacherId: c.classTeacherId ? String(c.classTeacherId) : "",
    });
    setFormErrors([]);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormErrors([]);

    const payload = {
      className: formData.className,
      level: formData.level,
      section: formData.section || undefined,
      capacity: Number(formData.capacity),
      classTeacherId: formData.classTeacherId ? Number(formData.classTeacherId) : null,
    };

    try {
      if (editingClass) {
        await api.patch(`/api/classes/${editingClass.id}`, payload);
        setFeedback({ type: "success", message: `Class ${formData.className} updated successfully.` });
      } else {
        await api.post("/api/classes", payload);
        setFeedback({ type: "success", message: `Class ${formData.className} created successfully.` });
      }
      setIsFormOpen(false);
      fetchClasses();
    } catch (err: any) {
      if (err.errors) {
        setFormErrors(err.errors);
      } else {
        setFormErrors([{ message: err.message || "Failed to save class." }]);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingClass) return;
    setSubmitting(true);
    try {
      await api.delete(`/api/classes/${deletingClass.id}`);
      setFeedback({ type: "success", message: "Class removed successfully." });
      setDeletingClass(null);
      fetchClasses();
    } catch (err: any) {
      setError(err.message || "Failed to delete class.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Class Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage instructional classes, sections, capacity limits, and class teacher allocations
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Class</span>
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
            placeholder="Search by class name or section..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Filter className="w-3.5 h-3.5" />
            <span>Level:</span>
          </div>

          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="text-xs px-2.5 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Levels</option>
            <option value="PRESCHOOL">Preschool</option>
            <option value="PRIMARY">Primary</option>
            <option value="JHS">Junior High (JHS)</option>
          </select>

          <button
            onClick={fetchClasses}
            className="p-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Classes Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Class Name</th>
                <th className="px-4 py-3">Educational Level</th>
                <th className="px-4 py-3">Stream / Section</th>
                <th className="px-4 py-3">Assigned Class Teacher</th>
                <th className="px-4 py-3 text-center">Enrollment / Capacity</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && classes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    <span className="inline-block w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2 align-middle" />
                    Loading classes...
                  </td>
                </tr>
              ) : classes.length > 0 ? (
                classes.map((cls) => {
                  const enrolled = cls._count?.enrollments || 0;
                  const isFull = enrolled >= cls.capacity;
                  return (
                    <tr key={cls.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-slate-900">{cls.className}</td>
                      <td className="px-4 py-3.5">
                        <Badge
                          variant={
                            cls.level === "PRESCHOOL" ? "warning" : cls.level === "PRIMARY" ? "info" : "default"
                          }
                        >
                          {cls.level}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600 font-medium">{cls.section || "—"}</td>
                      <td className="px-4 py-3.5 text-xs">
                        {cls.classTeacher ? (
                          <span className="font-medium text-slate-900">
                            {cls.classTeacher.firstName} {cls.classTeacher.lastName}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`font-semibold text-xs px-2 py-0.5 rounded ${
                            isFull ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-800"
                          }`}
                        >
                          {enrolled} / {cls.capacity}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => openEditModal(cls)}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded"
                            title="Edit class"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingClass(cls)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded"
                            title="Delete class"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-500 text-xs">
                    No classes found. Click &quot;Add New Class&quot; to configure one.
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
        title={editingClass ? "Edit School Class" : "Create School Class"}
        description="Classroom configuration, section stream, and teacher assignment"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formErrors.length > 0 && (
            <Alert type="error" message="Please review form errors:" errors={formErrors} />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Class Name *</label>
              <input
                type="text"
                required
                value={formData.className}
                onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                placeholder="e.g. Primary 1, JHS 2, Nursery 1"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Educational Level *</label>
              <select
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value as any })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
              >
                <option value="PRESCHOOL">Preschool</option>
                <option value="PRIMARY">Primary</option>
                <option value="JHS">Junior High School (JHS)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Section / Stream (Optional)</label>
              <input
                type="text"
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                placeholder="e.g. A, B, Gold, Blue"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Maximum Capacity *</label>
              <input
                type="number"
                min="1"
                max="100"
                required
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Class Teacher</label>
              <select
                value={formData.classTeacherId}
                onChange={(e) => setFormData({ ...formData, classTeacherId: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
              >
                <option value="">-- None (Unassigned) --</option>
                {staffOptions.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.firstName} {st.lastName} ({st.staffNumber} - {st.jobTitle})
                  </option>
                ))}
              </select>
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
              {submitting ? "Saving..." : editingClass ? "Save Changes" : "Create Class"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingClass}
        onClose={() => setDeletingClass(null)}
        onConfirm={handleDelete}
        title="Delete School Class"
        message={`Are you sure you want to delete class ${deletingClass?.className} ${
          deletingClass?.section ? `(${deletingClass.section})` : ""
        }? Note: Classes with active enrolled students cannot be deleted.`}
        confirmLabel="Delete Class"
        isLoading={submitting}
      />
    </div>
  );
}
