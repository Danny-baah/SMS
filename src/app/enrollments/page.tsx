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
  ChevronLeft,
  ChevronRight,
  ArrowRightLeft,
} from "lucide-react";

interface Enrollment {
  id: number;
  studentId: number;
  schoolClassId: number;
  academicYearId: number;
  enrollmentDate: string;
  status: "ENROLLED" | "TRANSFERRED" | "WITHDRAWN" | "COMPLETED";
  rollNumber: string | null;
  student: {
    id: number;
    admissionNumber: string;
    firstName: string;
    lastName: string;
    status: string;
  };
  schoolClass: {
    id: number;
    className: string;
    level: string;
    section: string | null;
  };
  academicYear: {
    id: number;
    name: string;
    isCurrent: boolean;
  };
}

interface SelectOption {
  id: number;
  name?: string;
  className?: string;
  firstName?: string;
  lastName?: string;
  admissionNumber?: string;
}

export default function EnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [classes, setClasses] = useState<SelectOption[]>([]);
  const [academicYears, setAcademicYears] = useState<SelectOption[]>([]);
  const [students, setStudents] = useState<SelectOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEnrollment, setEditingEnrollment] = useState<Enrollment | null>(null);
  const [withdrawingEnrollment, setWithdrawingEnrollment] = useState<Enrollment | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    studentId: "",
    schoolClassId: "",
    academicYearId: "",
    enrollmentDate: new Date().toISOString().split("T")[0],
    rollNumber: "",
    status: "ENROLLED",
  });
  const [formErrors, setFormErrors] = useState<Array<{ field?: string; message: string }>>([]);

  const fetchEnrollments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<Enrollment[]>("/api/enrollments", {
        page,
        limit: 10,
        search,
        schoolClassId: classFilter || undefined,
        academicYearId: yearFilter || undefined,
        status: statusFilter || undefined,
      });

      setEnrollments(res.data || []);
      if (res.pagination) {
        setPagination(res.pagination);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load enrollments.");
    } finally {
      setLoading(false);
    }
  }, [page, search, classFilter, yearFilter, statusFilter]);

  const loadDependencies = async () => {
    try {
      const [clsRes, ayRes, stRes] = await Promise.all([
        api.get<any[]>("/api/classes", { limit: 100 }),
        api.get<any[]>("/api/academic-years"),
        api.get<any[]>("/api/students", { limit: 100 }),
      ]);
      setClasses(clsRes.data || []);
      setAcademicYears(ayRes.data || []);
      setStudents(stRes.data || []);
    } catch {
      // fallback
    }
  };

  useEffect(() => {
    fetchEnrollments();
    loadDependencies();
  }, [fetchEnrollments]);

  const openCreateModal = () => {
    setEditingEnrollment(null);
    const activeYear = academicYears.find((ay: any) => ay.isCurrent) || academicYears[0];
    setFormData({
      studentId: "",
      schoolClassId: "",
      academicYearId: activeYear ? String(activeYear.id) : "",
      enrollmentDate: new Date().toISOString().split("T")[0],
      rollNumber: "",
      status: "ENROLLED",
    });
    setFormErrors([]);
    setIsFormOpen(true);
  };

  const openEditModal = (enr: Enrollment) => {
    setEditingEnrollment(enr);
    setFormData({
      studentId: String(enr.studentId),
      schoolClassId: String(enr.schoolClassId),
      academicYearId: String(enr.academicYearId),
      enrollmentDate: enr.enrollmentDate.split("T")[0],
      rollNumber: enr.rollNumber || "",
      status: enr.status,
    });
    setFormErrors([]);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormErrors([]);

    try {
      if (editingEnrollment) {
        await api.patch(`/api/enrollments/${editingEnrollment.id}`, {
          schoolClassId: Number(formData.schoolClassId),
          status: formData.status,
          rollNumber: formData.rollNumber || null,
        });
        setFeedback({ type: "success", message: "Enrollment updated / pupil transferred successfully." });
      } else {
        await api.post("/api/enrollments", {
          studentId: Number(formData.studentId),
          schoolClassId: Number(formData.schoolClassId),
          academicYearId: Number(formData.academicYearId),
          enrollmentDate: formData.enrollmentDate,
          rollNumber: formData.rollNumber || undefined,
          status: formData.status,
        });
        setFeedback({ type: "success", message: "Student enrolled successfully." });
      }
      setIsFormOpen(false);
      fetchEnrollments();
    } catch (err: any) {
      if (err.errors) {
        setFormErrors(err.errors);
      } else {
        setFormErrors([{ message: err.message || "Failed to save enrollment." }]);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawingEnrollment) return;
    setSubmitting(true);
    try {
      await api.delete(`/api/enrollments/${withdrawingEnrollment.id}`);
      setFeedback({
        type: "success",
        message: "Enrollment status marked as WITHDRAWN. Historical record preserved.",
      });
      setWithdrawingEnrollment(null);
      fetchEnrollments();
    } catch (err: any) {
      setError(err.message || "Failed to update enrollment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Enrollment Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Track student placement into classes, academic year registers, and student transfers
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Enrollment</span>
        </button>
      </div>

      {feedback && (
        <Alert type={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />
      )}
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search student name or admission #..."
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
            value={classFilter}
            onChange={(e) => {
              setClassFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs px-2.5 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Classes</option>
            {classes.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.className} {c.section && `(${c.section})`}
              </option>
            ))}
          </select>

          <select
            value={yearFilter}
            onChange={(e) => {
              setYearFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs px-2.5 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Academic Years</option>
            {academicYears.map((ay: any) => (
              <option key={ay.id} value={ay.id}>
                {ay.name} {ay.isCurrent ? "(Current)" : ""}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs px-2.5 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="ENROLLED">Enrolled</option>
            <option value="TRANSFERRED">Transferred</option>
            <option value="WITHDRAWN">Withdrawn</option>
            <option value="COMPLETED">Completed</option>
          </select>

          <button
            onClick={fetchEnrollments}
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
                <th className="px-5 py-3">Admission #</th>
                <th className="px-4 py-3">Student Name</th>
                <th className="px-4 py-3">Enrolled Class</th>
                <th className="px-4 py-3">Academic Year</th>
                <th className="px-3 py-3">Roll No.</th>
                <th className="px-4 py-3">Enrolled Date</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && enrollments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                    <span className="inline-block w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2 align-middle" />
                    Loading enrollments...
                  </td>
                </tr>
              ) : enrollments.length > 0 ? (
                enrollments.map((enr) => (
                  <tr key={enr.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs font-bold text-slate-900">
                      {enr.student.admissionNumber}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-900">
                      {enr.student.firstName} {enr.student.lastName}
                    </td>
                    <td className="px-4 py-3.5 text-xs font-semibold text-slate-800">
                      {enr.schoolClass.className}
                      {enr.schoolClass.section && (
                        <span className="text-slate-400 font-normal"> ({enr.schoolClass.section})</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600">
                      {enr.academicYear.name}
                      {enr.academicYear.isCurrent && (
                        <span className="ml-1.5 px-1 py-0.2 bg-blue-100 text-blue-700 rounded text-[10px]">
                          Current
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3.5 font-mono text-xs text-slate-500">
                      {enr.rollNumber || "—"}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600">
                      {new Date(enr.enrollmentDate).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-3.5">
                      <StatusBadge status={enr.status} />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(enr)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded"
                          title="Transfer or edit enrollment"
                        >
                          <ArrowRightLeft className="w-4 h-4" />
                        </button>
                        {enr.status !== "WITHDRAWN" && (
                          <button
                            onClick={() => setWithdrawingEnrollment(enr)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded"
                            title="Withdraw student from class"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-500 text-xs">
                    No enrollments match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-5 py-3.5 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
          <span>
            Showing {(pagination.page - 1) * pagination.limit + (enrollments.length > 0 ? 1 : 0)} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} enrollments
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

      {/* Create / Transfer Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingEnrollment ? "Transfer / Update Enrollment" : "Enroll Student"}
        description={
          editingEnrollment
            ? `Update class assignment for ${editingEnrollment.student.firstName} ${editingEnrollment.student.lastName}`
            : "Assign a pupil to a school class and academic year register"
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formErrors.length > 0 && (
            <Alert type="error" message="Please review form errors:" errors={formErrors} />
          )}

          <div className="space-y-4">
            {!editingEnrollment && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Student *</label>
                <select
                  required
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                >
                  <option value="">-- Choose Student --</option>
                  {students.map((st: any) => (
                    <option key={st.id} value={st.id}>
                      {st.firstName} {st.lastName} ({st.admissionNumber})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Target Class *</label>
              <select
                required
                value={formData.schoolClassId}
                onChange={(e) => setFormData({ ...formData, schoolClassId: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
              >
                <option value="">-- Choose Class --</option>
                {classes.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.className} {c.section && `(${c.section})`} — {c.level}
                  </option>
                ))}
              </select>
            </div>

            {!editingEnrollment && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Academic Year *</label>
                <select
                  required
                  value={formData.academicYearId}
                  onChange={(e) => setFormData({ ...formData, academicYearId: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                >
                  <option value="">-- Choose Academic Year --</option>
                  {academicYears.map((ay: any) => (
                    <option key={ay.id} value={ay.id}>
                      {ay.name} {ay.isCurrent ? "(Current)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Roll / Index Number (Optional)</label>
                <input
                  type="text"
                  value={formData.rollNumber}
                  onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                  placeholder="e.g. ROLL-001"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Enrollment Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                >
                  <option value="ENROLLED">Enrolled</option>
                  <option value="TRANSFERRED">Transferred</option>
                  <option value="WITHDRAWN">Withdrawn</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
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
              {submitting ? "Saving..." : editingEnrollment ? "Update Transfer" : "Save Enrollment"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Withdraw Confirmation */}
      <ConfirmDialog
        isOpen={!!withdrawingEnrollment}
        onClose={() => setWithdrawingEnrollment(null)}
        onConfirm={handleWithdraw}
        title="Withdraw Student from Class"
        message={`Mark ${withdrawingEnrollment?.student.firstName} ${withdrawingEnrollment?.student.lastName} as WITHDRAWN from ${withdrawingEnrollment?.schoolClass.className}? Historical attendance and academic records will be preserved.`}
        confirmLabel="Withdraw Pupil"
        isLoading={submitting}
      />
    </div>
  );
}
