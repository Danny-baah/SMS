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
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  Calendar,
} from "lucide-react";

interface StaffMember {
  id: number;
  staffNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  jobTitle: string;
  employmentStatus: "ACTIVE" | "ON_LEAVE" | "TERMINATED" | "RESIGNED";
  hireDate: string;
  classesAsTeacher?: Array<{
    id: number;
    className: string;
    level: string;
    section: string | null;
  }>;
}

export default function StaffPage() {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [viewingStaff, setViewingStaff] = useState<StaffMember | null>(null);
  const [deletingStaff, setDeletingStaff] = useState<StaffMember | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    staffNumber: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    jobTitle: "Teacher",
    employmentStatus: "ACTIVE",
    hireDate: new Date().toISOString().split("T")[0],
  });
  const [formErrors, setFormErrors] = useState<Array<{ field?: string; message: string }>>([]);

  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<StaffMember[]>("/api/staff", {
        page,
        limit: 10,
        search,
        employmentStatus: statusFilter || undefined,
      });

      setStaffList(res.data || []);
      if (res.pagination) {
        setPagination(res.pagination);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load staff list.");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const openCreateModal = () => {
    setEditingStaff(null);
    setFormData({
      staffNumber: `STF-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      jobTitle: "Teacher",
      employmentStatus: "ACTIVE",
      hireDate: new Date().toISOString().split("T")[0],
    });
    setFormErrors([]);
    setIsFormOpen(true);
  };

  const openEditModal = (staff: StaffMember) => {
    setEditingStaff(staff);
    setFormData({
      staffNumber: staff.staffNumber,
      firstName: staff.firstName,
      lastName: staff.lastName,
      email: staff.email,
      phone: staff.phone,
      jobTitle: staff.jobTitle,
      employmentStatus: staff.employmentStatus,
      hireDate: staff.hireDate.split("T")[0],
    });
    setFormErrors([]);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormErrors([]);

    try {
      if (editingStaff) {
        await api.patch(`/api/staff/${editingStaff.id}`, formData);
        setFeedback({ type: "success", message: `Staff member ${formData.firstName} updated successfully.` });
      } else {
        await api.post("/api/staff", formData);
        setFeedback({ type: "success", message: `Staff member ${formData.firstName} added successfully.` });
      }
      setIsFormOpen(false);
      fetchStaff();
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
    if (!deletingStaff) return;
    setSubmitting(true);
    try {
      await api.delete(`/api/staff/${deletingStaff.id}`);
      setFeedback({ type: "success", message: "Staff member deleted successfully." });
      setDeletingStaff(null);
      fetchStaff();
    } catch (err: any) {
      setError(err.message || "Failed to delete staff member.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Staff Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Maintain records of head teachers, instructors, educators, and school administration staff
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Staff Member</span>
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
            placeholder="Search by name, staff #, or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
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
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs px-2.5 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="ON_LEAVE">On Leave</option>
            <option value="TERMINATED">Terminated</option>
            <option value="RESIGNED">Resigned</option>
          </select>

          <button
            onClick={fetchStaff}
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
                <th className="px-5 py-3">Staff #</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Role / Job Title</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Class Teacher</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && staffList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    <span className="inline-block w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2 align-middle" />
                    Loading staff records...
                  </td>
                </tr>
              ) : staffList.length > 0 ? (
                staffList.map((staff) => (
                  <tr key={staff.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs font-semibold text-slate-900">
                      {staff.staffNumber}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-900">
                      {staff.firstName} {staff.lastName}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-700 font-medium">
                      {staff.jobTitle}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600">
                      <div>{staff.email}</div>
                      <div className="font-mono text-slate-400 text-[11px]">{staff.phone}</div>
                    </td>
                    <td className="px-4 py-3.5 text-xs">
                      {staff.classesAsTeacher && staff.classesAsTeacher.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {staff.classesAsTeacher.map((c) => (
                            <span
                              key={c.id}
                              className="px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-800 rounded text-[11px] font-medium"
                            >
                              {c.className} {c.section && `(${c.section})`}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">None</span>
                      )}
                    </td>
                    <td className="px-3 py-3.5">
                      <StatusBadge status={staff.employmentStatus} />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => setViewingStaff(staff)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded"
                          title="View profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(staff)}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded"
                          title="Edit staff"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingStaff(staff)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded"
                          title="Delete staff"
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
                    No staff members found matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-5 py-3.5 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
          <span>
            Showing {(pagination.page - 1) * pagination.limit + (staffList.length > 0 ? 1 : 0)} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} staff members
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
        title={editingStaff ? "Edit Staff Member" : "Add Staff Member"}
        description="Faculty, educator, or administrative personnel details"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formErrors.length > 0 && (
            <Alert type="error" message="Please review the form errors:" errors={formErrors} />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Staff Number *</label>
              <input
                type="text"
                required
                value={formData.staffNumber}
                onChange={(e) => setFormData({ ...formData, staffNumber: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Employment Status</label>
              <select
                value={formData.employmentStatus}
                onChange={(e) => setFormData({ ...formData, employmentStatus: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
              >
                <option value="ACTIVE">Active</option>
                <option value="ON_LEAVE">On Leave</option>
                <option value="TERMINATED">Terminated</option>
                <option value="RESIGNED">Resigned</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">First Name *</label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name *</label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="staff@school.edu.gh"
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

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Job Title *</label>
              <input
                type="text"
                required
                value={formData.jobTitle}
                onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                placeholder="e.g. Science Teacher, Head Teacher"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Hire Date *</label>
              <input
                type="date"
                required
                value={formData.hireDate}
                onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
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
              {submitting ? "Saving..." : editingStaff ? "Save Changes" : "Save Staff"}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Staff Modal */}
      {viewingStaff && (
        <Modal
          isOpen={true}
          onClose={() => setViewingStaff(null)}
          title={`${viewingStaff.firstName} ${viewingStaff.lastName}`}
          description={`Staff ID: ${viewingStaff.staffNumber}`}
        >
          <div className="space-y-4 text-sm">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900">{viewingStaff.jobTitle}</span>
                <StatusBadge status={viewingStaff.employmentStatus} />
              </div>
              <div className="text-xs text-slate-600 space-y-1 pt-1">
                <p>Email: <span className="font-medium text-slate-800">{viewingStaff.email}</span></p>
                <p>Phone: <span className="font-mono text-slate-800">{viewingStaff.phone}</span></p>
                <p>Hire Date: <span className="font-medium text-slate-800">{new Date(viewingStaff.hireDate).toLocaleDateString()}</span></p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">
                Classes Assigned as Class Teacher
              </h4>
              {viewingStaff.classesAsTeacher && viewingStaff.classesAsTeacher.length > 0 ? (
                <div className="space-y-1.5">
                  {viewingStaff.classesAsTeacher.map((c) => (
                    <div
                      key={c.id}
                      className="p-2.5 bg-white border border-slate-200 rounded-lg text-xs flex items-center justify-between"
                    >
                      <span className="font-semibold text-slate-900">{c.className}</span>
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600">{c.level}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No class teacher assignments assigned currently.</p>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setViewingStaff(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingStaff}
        onClose={() => setDeletingStaff(null)}
        onConfirm={handleDelete}
        title="Delete Staff Member"
        message={`Are you sure you want to permanently delete ${deletingStaff?.firstName} ${deletingStaff?.lastName} (${deletingStaff?.staffNumber})?`}
        confirmLabel="Delete Staff"
        isLoading={submitting}
      />
    </div>
  );
}
