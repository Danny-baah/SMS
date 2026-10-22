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
} from "lucide-react";

interface Student {
  id: number;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  sex: "MALE" | "FEMALE" | "OTHER";
  address: string;
  admissionDate: string;
  status: "ACTIVE" | "INACTIVE" | "TRANSFERRED" | "GRADUATED" | "SUSPENDED";
  enrollments?: Array<{
    schoolClass: { id?: number; className: string; level: string; section: string | null };
    academicYear: { name: string };
  }>;
  guardians?: Array<{
    guardian: { id: number; fullName: string; phone: string; relationship: string };
  }>;
}

interface SchoolClassOption {
  id: number;
  className: string;
  level: string;
  section: string | null;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClassOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Search & Pagination State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sexFilter, setSexFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    admissionNumber: "",
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    sex: "MALE",
    address: "",
    admissionDate: new Date().toISOString().split("T")[0],
    status: "ACTIVE",
    classId: "",
  });
  const [formErrors, setFormErrors] = useState<Array<{ field?: string; message: string }>>([]);

  // Fetch classes for dropdown
  useEffect(() => {
    api.get<SchoolClassOption[]>("/api/classes?limit=100")
      .then((res) => setClasses(res.data || []))
      .catch((err) => console.error("Failed to load classes:", err));
  }, []);

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<Student[]>("/api/students", {
        page,
        limit: 10,
        search,
        status: statusFilter || undefined,
        sex: sexFilter || undefined,
      });

      setStudents(res.data || []);
      if (res.pagination) {
        setPagination(res.pagination);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load students.");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, sexFilter]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const openCreateModal = () => {
    setEditingStudent(null);
    setFormData({
      admissionNumber: `STU-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      sex: "MALE",
      address: "",
      admissionDate: new Date().toISOString().split("T")[0],
      status: "ACTIVE",
      classId: "",
    });
    setFormErrors([]);
    setIsFormOpen(true);
  };

  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      admissionNumber: student.admissionNumber,
      firstName: student.firstName,
      lastName: student.lastName,
      dateOfBirth: student.dateOfBirth.split("T")[0],
      sex: student.sex,
      address: student.address,
      admissionDate: student.admissionDate.split("T")[0],
      status: student.status,
      classId: student.enrollments?.[0]?.schoolClass?.id ? String(student.enrollments[0].schoolClass.id) : "",
    });
    setFormErrors([]);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormErrors([]);

    try {
      if (editingStudent) {
        await api.patch(`/api/students/${editingStudent.id}`, formData);
        setFeedback({ type: "success", message: `Student ${formData.firstName} updated successfully.` });
      } else {
        await api.post("/api/students", formData);
        setFeedback({ type: "success", message: `Student ${formData.firstName} admitted successfully.` });
      }
      setIsFormOpen(false);
      fetchStudents();
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
    if (!deletingStudent) return;
    setSubmitting(true);
    try {
      await api.delete(`/api/students/${deletingStudent.id}`);
      setFeedback({ type: "success", message: `Student record removed successfully.` });
      setDeletingStudent(null);
      fetchStudents();
    } catch (err: any) {
      setError(err.message || "Failed to delete student.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Student Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Register, view, update, and manage pupils across Preschool, Primary, and JHS
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Admit New Student</span>
        </button>
      </div>

      {feedback && (
        <Alert
          type={feedback.type}
          message={feedback.message}
          onClose={() => setFeedback(null)}
        />
      )}
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by name or admission #..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
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
            <option value="INACTIVE">Inactive</option>
            <option value="TRANSFERRED">Transferred</option>
            <option value="GRADUATED">Graduated</option>
            <option value="SUSPENDED">Suspended</option>
          </select>

          <select
            value={sexFilter}
            onChange={(e) => {
              setSexFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs px-2.5 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Sex</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>

          <button
            onClick={fetchStudents}
            className="p-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Students Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Admission #</th>
                <th className="px-4 py-3">Student Name</th>
                <th className="px-3 py-3">Sex</th>
                <th className="px-4 py-3">Current Class</th>
                <th className="px-4 py-3">Admission Date</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && students.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    <span className="inline-block w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2 align-middle" />
                    Loading students from database...
                  </td>
                </tr>
              ) : students.length > 0 ? (
                students.map((student) => {
                  const currentEnrollment = student.enrollments?.[0];
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs font-semibold text-slate-900">
                        {student.admissionNumber}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-900">
                        {student.firstName} {student.lastName}
                      </td>
                      <td className="px-3 py-3.5 text-xs text-slate-600">{student.sex}</td>
                      <td className="px-4 py-3.5 text-xs">
                        {currentEnrollment ? (
                          <span className="font-medium text-slate-800">
                            {currentEnrollment.schoolClass.className}
                            {currentEnrollment.schoolClass.section && (
                              <span className="text-slate-400"> ({currentEnrollment.schoolClass.section})</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Not enrolled</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">
                        {new Date(student.admissionDate).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-3.5">
                        <StatusBadge status={student.status} />
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => setViewingStudent(student)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(student)}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded"
                            title="Edit student"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingStudent(student)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded"
                            title="Delete student"
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
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500 text-xs">
                    No students match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-5 py-3.5 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
          <span>
            Showing {(pagination.page - 1) * pagination.limit + (students.length > 0 ? 1 : 0)} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} students
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

      {/* Create / Edit Student Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingStudent ? "Edit Student Profile" : "Admit New Student"}
        description="Enter the pupil's official admission and biographical details"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formErrors.length > 0 && (
            <Alert type="error" message="Please review the form errors:" errors={formErrors} />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth *</label>
              <input
                type="date"
                required
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Sex *</label>
              <select
                value={formData.sex}
                onChange={(e) => setFormData({ ...formData, sex: e.target.value as any })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Admission Number *</label>
              <input
                type="text"
                required
                value={formData.admissionNumber}
                onChange={(e) => setFormData({ ...formData, admissionNumber: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Admission Date *</label>
              <input
                type="date"
                required
                value={formData.admissionDate}
                onChange={(e) => setFormData({ ...formData, admissionDate: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className={editingStudent ? "sm:col-span-1" : "sm:col-span-2"}>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Class Enrollment {editingStudent ? "" : "(Optional)"}
              </label>
              <select
                value={formData.classId}
                onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium text-slate-800"
              >
                <option value="">-- Select Class to Enroll Pupil --</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.className} {cls.section ? `(${cls.section})` : ""} — {cls.level}
                  </option>
                ))}
              </select>
            </div>

            {/* Status is only shown when editing/updating an existing student */}
            {editingStudent && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Student Status *</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium text-slate-800"
                >
                  <option value="ACTIVE">Active (Enrolled & Attending)</option>
                  <option value="INACTIVE">Inactive (Temporarily Withdrawn)</option>
                  <option value="TRANSFERRED">Transferred (Moved to another school)</option>
                  <option value="GRADUATED">Graduated (Completed final level)</option>
                  <option value="SUSPENDED">Suspended (Disciplinary hold)</option>
                </select>
              </div>
            )}

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Residential Address *</label>
              <input
                type="text"
                required
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="e.g. Plot 14 Block B, Kumasi, Ghana"
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
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? "Saving..." : editingStudent ? "Save Changes" : "Admit Student"}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Student Details Modal */}
      {viewingStudent && (
        <Modal
          isOpen={true}
          onClose={() => setViewingStudent(null)}
          title={`Student: ${viewingStudent.firstName} ${viewingStudent.lastName}`}
          description={`Admission No: ${viewingStudent.admissionNumber}`}
        >
          <div className="space-y-5 text-sm">
            <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <span className="text-xs text-slate-500 block">Status</span>
                <StatusBadge status={viewingStudent.status} />
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Current Class</span>
                <span className="font-medium text-slate-850">
                  {viewingStudent.enrollments?.[0]?.schoolClass?.className ? (
                    <>
                      {viewingStudent.enrollments[0].schoolClass.className}
                      {viewingStudent.enrollments[0].schoolClass.section && (
                        <span className="text-slate-400"> ({viewingStudent.enrollments[0].schoolClass.section})</span>
                      )}
                    </>
                  ) : (
                    <span className="text-slate-400 italic">Not enrolled</span>
                  )}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Sex</span>
                <span className="font-medium text-slate-800">{viewingStudent.sex}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Date of Birth</span>
                <span className="font-medium text-slate-800">
                  {new Date(viewingStudent.dateOfBirth).toLocaleDateString()}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-xs text-slate-500 block">Admission Date</span>
                <span className="font-medium text-slate-800">
                  {new Date(viewingStudent.admissionDate).toLocaleDateString()}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-xs text-slate-500 block">Address</span>
                <span className="font-medium text-slate-800">{viewingStudent.address}</span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">
                Linked Guardians
              </h4>
              {viewingStudent.guardians && viewingStudent.guardians.length > 0 ? (
                <div className="space-y-2">
                  {viewingStudent.guardians.map((g, idx) => (
                    <div
                      key={idx}
                      className="p-3 border border-slate-200 rounded-lg flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-semibold text-slate-800">{g.guardian.fullName}</p>
                        <p className="text-slate-500">{g.guardian.relationship}</p>
                      </div>
                      <span className="font-mono text-slate-600">{g.guardian.phone}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No guardians linked to this pupil yet.</p>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setViewingStudent(null)}
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
        isOpen={!!deletingStudent}
        onClose={() => setDeletingStudent(null)}
        onConfirm={handleDelete}
        title="Delete Student Record"
        message={`Are you sure you want to permanently delete ${deletingStudent?.firstName} ${deletingStudent?.lastName} (${deletingStudent?.admissionNumber})? This will also remove associated enrollments and guardian links.`}
        confirmLabel="Delete Student"
        isLoading={submitting}
      />
    </div>
  );
}
