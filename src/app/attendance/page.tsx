"use client";

import React, { useEffect, useState, useCallback } from "react";
import api from "@/lib/api-client";
import { Alert } from "@/components/ui/Alert";
import { StatusBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import {
  Plus,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Edit2,
  Trash2,
} from "lucide-react";

interface AttendanceRecord {
  id: number;
  studentId: number;
  schoolClassId: number;
  date: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  remarks: string | null;
  student: {
    id: number;
    admissionNumber: string;
    firstName: string;
    lastName: string;
  };
  schoolClass: {
    id: number;
    className: string;
    level: string;
    section: string | null;
  };
  recordedBy?: {
    id: number;
    firstName: string;
    lastName: string;
  } | null;
}

interface ClassOption {
  id: number;
  className: string;
  level: string;
  section: string | null;
}

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Filters & Pagination
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [classFilter, setClassFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });

  // Bulk Register Modal State
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkClassId, setBulkClassId] = useState("");
  const [bulkDate, setBulkDate] = useState(new Date().toISOString().split("T")[0]);
  const [enrolledPupils, setEnrolledPupils] = useState<any[]>([]);
  const [bulkEntries, setBulkEntries] = useState<Record<number, { status: string; remarks: string }>>({});
  const [loadingPupils, setLoadingPupils] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Edit Single Record
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editStatus, setEditStatus] = useState<string>("PRESENT");
  const [editRemarks, setEditRemarks] = useState<string>("");

  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<AttendanceRecord[]>("/api/attendance", {
        page,
        limit: 15,
        startDate: selectedDate || undefined,
        endDate: selectedDate || undefined,
        schoolClassId: classFilter || undefined,
        status: statusFilter || undefined,
      });

      setRecords(res.data || []);
      if (res.pagination) {
        setPagination(res.pagination);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load attendance records.");
    } finally {
      setLoading(false);
    }
  }, [page, selectedDate, classFilter, statusFilter]);

  const fetchClasses = async () => {
    try {
      const res = await api.get<ClassOption[]>("/api/classes", { limit: 100 });
      setClasses(res.data || []);
    } catch {
      // fallback
    }
  };

  useEffect(() => {
    fetchAttendance();
    fetchClasses();
  }, [fetchAttendance]);

  // Load students when bulk class changes
  const handleBulkClassChange = async (classId: string) => {
    setBulkClassId(classId);
    if (!classId) {
      setEnrolledPupils([]);
      return;
    }

    try {
      setLoadingPupils(true);
      const res = await api.get<any[]>("/api/enrollments", {
        schoolClassId: classId,
        status: "ENROLLED",
        limit: 100,
      });

      const pupils = res.data || [];
      setEnrolledPupils(pupils);

      // Default all enrolled pupils to PRESENT
      const initial: Record<number, { status: string; remarks: string }> = {};
      pupils.forEach((p) => {
        initial[p.student.id] = { status: "PRESENT", remarks: "" };
      });
      setBulkEntries(initial);
    } catch (err: any) {
      setError(err.message || "Failed to load pupils for selected class.");
    } finally {
      setLoadingPupils(false);
    }
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkClassId || enrolledPupils.length === 0) return;

    setSubmitting(true);
    try {
      const formattedRecords = enrolledPupils.map((p) => ({
        studentId: p.student.id,
        status: bulkEntries[p.student.id]?.status || "PRESENT",
        remarks: bulkEntries[p.student.id]?.remarks || undefined,
      }));

      await api.post("/api/attendance", {
        schoolClassId: Number(bulkClassId),
        date: bulkDate,
        records: formattedRecords,
      });

      setFeedback({
        type: "success",
        message: `Attendance marked for ${formattedRecords.length} pupils on ${bulkDate}.`,
      });
      setIsBulkOpen(false);
      fetchAttendance();
    } catch (err: any) {
      setError(err.message || "Failed to save attendance.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    setSubmitting(true);
    try {
      await api.patch(`/api/attendance/${editingRecord.id}`, {
        status: editStatus,
        remarks: editRemarks || null,
      });

      setFeedback({ type: "success", message: "Attendance record updated successfully." });
      setEditingRecord(null);
      fetchAttendance();
    } catch (err: any) {
      setError(err.message || "Failed to update record.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Attendance Tracking</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Log daily classroom attendance, track absences, and mark excused or late arrivals
          </p>
        </div>
        <button
          onClick={() => {
            setIsBulkOpen(true);
            setEnrolledPupils([]);
            setBulkClassId("");
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors self-start sm:self-auto"
        >
          <ClipboardList className="w-4 h-4" />
          <span>Mark Class Register</span>
        </button>
      </div>

      {feedback && (
        <Alert type={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />
      )}
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
              Select Date:
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setPage(1);
              }}
              className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
              Class:
            </label>
            <select
              value={classFilter}
              onChange={(e) => {
                setClassFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.className} {c.section && `(${c.section})`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
              Status:
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="PRESENT">Present</option>
              <option value="ABSENT">Absent</option>
              <option value="LATE">Late</option>
              <option value="EXCUSED">Excused</option>
            </select>
          </div>
        </div>

        <button
          onClick={fetchAttendance}
          className="p-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors self-end md:self-auto"
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
                <th className="px-5 py-3">Admission #</th>
                <th className="px-4 py-3">Pupil Name</th>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-3 py-3">Attendance Status</th>
                <th className="px-4 py-3">Remarks</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    <span className="inline-block w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2 align-middle" />
                    Loading attendance...
                  </td>
                </tr>
              ) : records.length > 0 ? (
                records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs font-bold text-slate-900">
                      {rec.student.admissionNumber}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-900">
                      {rec.student.firstName} {rec.student.lastName}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-700 font-medium">
                      {rec.schoolClass.className} {rec.schoolClass.section && `(${rec.schoolClass.section})`}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600">
                      {new Date(rec.date).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-3.5">
                      <StatusBadge status={rec.status} />
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500 italic">
                      {rec.remarks || "—"}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => {
                          setEditingRecord(rec);
                          setEditStatus(rec.status);
                          setEditRemarks(rec.remarks || "");
                        }}
                        className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded"
                        title="Update attendance"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500 text-xs">
                    No attendance records found for selected date and filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-5 py-3.5 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
          <span>
            Showing {(pagination.page - 1) * pagination.limit + (records.length > 0 ? 1 : 0)} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} records
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

      {/* Mark Bulk Class Register Modal */}
      <Modal
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        title="Mark Class Attendance Register"
        description="Select a class and record attendance for all active enrolled pupils"
        maxWidth="xl"
      >
        <form onSubmit={handleBulkSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-3 border-b border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Target Class *</label>
              <select
                required
                value={bulkClassId}
                onChange={(e) => handleBulkClassChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
              >
                <option value="">-- Choose Classroom --</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.className} {c.section && `(${c.section})`} — {c.level}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Attendance Date *</label>
              <input
                type="date"
                required
                value={bulkDate}
                onChange={(e) => setBulkDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Pupil Roster with Status Toggle */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Enrolled Pupils ({enrolledPupils.length})
            </h4>

            {loadingPupils ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading classroom roster...</div>
            ) : enrolledPupils.length > 0 ? (
              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {enrolledPupils.map((p) => {
                  const studentId = p.student.id;
                  const currentStatus = bulkEntries[studentId]?.status || "PRESENT";
                  return (
                    <div
                      key={studentId}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">
                          {p.student.firstName} {p.student.lastName}
                        </p>
                        <p className="font-mono text-slate-500 text-[11px]">{p.student.admissionNumber}</p>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {["PRESENT", "ABSENT", "LATE", "EXCUSED"].map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() =>
                              setBulkEntries({
                                ...bulkEntries,
                                [studentId]: {
                                  ...bulkEntries[studentId],
                                  status: st,
                                },
                              })
                            }
                            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                              currentStatus === st
                                ? st === "PRESENT"
                                  ? "bg-emerald-600 text-white"
                                  : st === "ABSENT"
                                  ? "bg-rose-600 text-white"
                                  : st === "LATE"
                                  ? "bg-amber-600 text-white"
                                  : "bg-blue-600 text-white"
                                : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : bulkClassId ? (
              <p className="py-6 text-center text-xs text-slate-500 italic">
                No active students are currently enrolled in this class.
              </p>
            ) : (
              <p className="py-6 text-center text-xs text-slate-400 italic">
                Please select a classroom above to display the roll.
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsBulkOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || enrolledPupils.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? "Saving Register..." : "Submit Attendance"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Single Record Modal */}
      {editingRecord && (
        <Modal
          isOpen={true}
          onClose={() => setEditingRecord(null)}
          title={`Update Attendance: ${editingRecord.student.firstName} ${editingRecord.student.lastName}`}
          description={`Class: ${editingRecord.schoolClass.className} | Date: ${new Date(editingRecord.date).toLocaleDateString()}`}
          maxWidth="md"
        >
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status *</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
              >
                <option value="PRESENT">Present</option>
                <option value="ABSENT">Absent</option>
                <option value="LATE">Late</option>
                <option value="EXCUSED">Excused</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks (Optional)</label>
              <input
                type="text"
                value={editRemarks}
                onChange={(e) => setEditRemarks(e.target.value)}
                placeholder="e.g. Doctor note provided, excused early"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? "Updating..." : "Save Status"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
