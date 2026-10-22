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
  Edit2,
  Trash2,
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  MapPin,
  Link2,
} from "lucide-react";

interface Guardian {
  id: number;
  fullName: string;
  relationship: string;
  phone: string;
  email: string | null;
  address: string;
  students?: Array<{
    student: {
      id: number;
      admissionNumber: string;
      firstName: string;
      lastName: string;
      status: string;
    };
  }>;
}

export default function GuardiansPage() {
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGuardian, setEditingGuardian] = useState<Guardian | null>(null);
  const [viewingGuardian, setViewingGuardian] = useState<Guardian | null>(null);
  const [deletingGuardian, setDeletingGuardian] = useState<Guardian | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Link Student Modal State
  const [linkingGuardian, setLinkingGuardian] = useState<Guardian | null>(null);
  const [allStudents, setAllStudents] = useState<Array<{ id: number; firstName: string; lastName: string; admissionNumber: string }>>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [linkIsPrimary, setLinkIsPrimary] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    fullName: "",
    relationship: "Parent",
    phone: "",
    email: "",
    address: "",
  });
  const [formErrors, setFormErrors] = useState<Array<{ field?: string; message: string }>>([]);

  const fetchGuardians = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<Guardian[]>("/api/guardians", {
        page,
        limit: 10,
        search,
      });

      setGuardians(res.data || []);
      if (res.pagination) {
        setPagination(res.pagination);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load guardians.");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchGuardians();
  }, [fetchGuardians]);

  const openCreateModal = () => {
    setEditingGuardian(null);
    setFormData({
      fullName: "",
      relationship: "Parent",
      phone: "",
      email: "",
      address: "",
    });
    setFormErrors([]);
    setIsFormOpen(true);
  };

  const openEditModal = (guardian: Guardian) => {
    setEditingGuardian(guardian);
    setFormData({
      fullName: guardian.fullName,
      relationship: guardian.relationship,
      phone: guardian.phone,
      email: guardian.email || "",
      address: guardian.address,
    });
    setFormErrors([]);
    setIsFormOpen(true);
  };

  const openLinkStudentModal = async (guardian: Guardian) => {
    setLinkingGuardian(guardian);
    setSelectedStudentId("");
    setLinkIsPrimary(false);
    try {
      const res = await api.get<any[]>("/api/students", { limit: 100 });
      setAllStudents(res.data || []);
    } catch {
      // fallback
    }
  };

  const handleLinkStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkingGuardian || !selectedStudentId) return;

    setSubmitting(true);
    try {
      await api.post("/api/student-guardians", {
        guardianId: linkingGuardian.id,
        studentId: parseInt(selectedStudentId, 10),
        isPrimary: linkIsPrimary,
        relationship: linkingGuardian.relationship,
      });
      setFeedback({ type: "success", message: "Student linked to guardian successfully." });
      setLinkingGuardian(null);
      fetchGuardians();
    } catch (err: any) {
      setError(err.message || "Failed to link student.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormErrors([]);

    try {
      if (editingGuardian) {
        await api.patch(`/api/guardians/${editingGuardian.id}`, formData);
        setFeedback({ type: "success", message: `Guardian ${formData.fullName} updated successfully.` });
      } else {
        await api.post("/api/guardians", formData);
        setFeedback({ type: "success", message: `Guardian ${formData.fullName} created successfully.` });
      }
      setIsFormOpen(false);
      fetchGuardians();
    } catch (err: any) {
      if (err.errors) {
        setFormErrors(err.errors);
      } else {
        setFormErrors([{ message: err.message || "Operation failed" }]);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingGuardian) return;
    setSubmitting(true);
    try {
      await api.delete(`/api/guardians/${deletingGuardian.id}`);
      setFeedback({ type: "success", message: "Guardian deleted successfully." });
      setDeletingGuardian(null);
      fetchGuardians();
    } catch (err: any) {
      setError(err.message || "Failed to delete guardian.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Guardian Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage student parents, guardians, emergency contacts, and family linkages
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Guardian</span>
        </button>
      </div>

      {feedback && (
        <Alert type={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />
      )}
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Search Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search guardian name, phone, or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <button
          onClick={fetchGuardians}
          className="p-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors self-end sm:self-auto"
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
                <th className="px-5 py-3">Full Name</th>
                <th className="px-4 py-3">Relationship</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Linked Wards</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && guardians.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    <span className="inline-block w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2 align-middle" />
                    Loading guardians...
                  </td>
                </tr>
              ) : guardians.length > 0 ? (
                guardians.map((guardian) => (
                  <tr key={guardian.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-slate-900">{guardian.fullName}</td>
                    <td className="px-4 py-3.5 text-xs text-slate-600">{guardian.relationship}</td>
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-800">{guardian.phone}</td>
                    <td className="px-4 py-3.5 text-xs text-slate-500">{guardian.email || "—"}</td>
                    <td className="px-4 py-3.5">
                      {guardian.students && guardian.students.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {guardian.students.map((st) => (
                            <span
                              key={st.student.id}
                              className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[11px] font-medium text-slate-800"
                            >
                              {st.student.firstName} {st.student.lastName}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">None linked</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => openLinkStudentModal(guardian)}
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded"
                          title="Link pupil"
                        >
                          <Link2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setViewingGuardian(guardian)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(guardian)}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded"
                          title="Edit guardian"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingGuardian(guardian)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded"
                          title="Delete guardian"
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
                    No guardians found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-5 py-3.5 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
          <span>
            Showing {(pagination.page - 1) * pagination.limit + (guardians.length > 0 ? 1 : 0)} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} guardians
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 border border-slate-200 rounded hover:bg-white disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-medium text-slate-700 px-2">
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="p-1.5 border border-slate-200 rounded hover:bg-white disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingGuardian ? "Edit Guardian Profile" : "Register Guardian"}
        description="Parent, family guardian, or legal contact information"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formErrors.length > 0 && (
            <Alert type="error" message="Please review form errors:" errors={formErrors} />
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="e.g. Mrs. Mary Mensah"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Relationship to Pupil *</label>
              <input
                type="text"
                required
                value={formData.relationship}
                onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                placeholder="e.g. Mother, Father, Uncle"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number *</label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+233 24 000 0000"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address (Optional)</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="guardian@example.com"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Home Address *</label>
            <input
              type="text"
              required
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="e.g. House No. 22 Sunset Boulevard, Kumasi"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
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
              {submitting ? "Saving..." : editingGuardian ? "Save Changes" : "Save Guardian"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Link Student Modal */}
      {linkingGuardian && (
        <Modal
          isOpen={true}
          onClose={() => setLinkingGuardian(null)}
          title={`Link Student to ${linkingGuardian.fullName}`}
          description="Select a pupil to associate with this guardian contact"
          maxWidth="md"
        >
          <form onSubmit={handleLinkStudent} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Select Pupil *</label>
              <select
                required
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
              >
                <option value="">-- Choose Pupil --</option>
                {allStudents.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.firstName} {st.lastName} ({st.admissionNumber})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isPrimary"
                checked={linkIsPrimary}
                onChange={(e) => setLinkIsPrimary(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <label htmlFor="isPrimary" className="text-xs text-slate-700 font-medium">
                Mark as Primary Emergency Contact for this pupil
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setLinkingGuardian(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !selectedStudentId}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? "Linking..." : "Link Pupil"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* View Details Modal */}
      {viewingGuardian && (
        <Modal
          isOpen={true}
          onClose={() => setViewingGuardian(null)}
          title={viewingGuardian.fullName}
          description="Guardian Record Details"
        >
          <div className="space-y-4 text-sm">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 text-slate-700">
                <Badge variant="info">{viewingGuardian.relationship}</Badge>
              </div>
              <div className="flex items-center gap-2 text-slate-800">
                <Phone className="w-4 h-4 text-slate-400" />
                <span className="font-mono">{viewingGuardian.phone}</span>
              </div>
              {viewingGuardian.email && (
                <div className="flex items-center gap-2 text-slate-800">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span>{viewingGuardian.email}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-slate-800">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>{viewingGuardian.address}</span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">
                Associated Pupils
              </h4>
              {viewingGuardian.students && viewingGuardian.students.length > 0 ? (
                <div className="space-y-2">
                  {viewingGuardian.students.map((st) => (
                    <div
                      key={st.student.id}
                      className="p-3 border border-slate-200 rounded-lg flex items-center justify-between text-xs"
                    >
                      <span className="font-semibold text-slate-900">
                        {st.student.firstName} {st.student.lastName}
                      </span>
                      <span className="font-mono text-slate-500">{st.student.admissionNumber}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No pupils linked to this guardian yet.</p>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setViewingGuardian(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingGuardian}
        onClose={() => setDeletingGuardian(null)}
        onConfirm={handleDelete}
        title="Delete Guardian Record"
        message={`Are you sure you want to delete ${deletingGuardian?.fullName}? All associations with students will be unlinked.`}
        confirmLabel="Delete Guardian"
        isLoading={submitting}
      />
    </div>
  );
}
