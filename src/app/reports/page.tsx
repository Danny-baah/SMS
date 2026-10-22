"use client";

import React, { useEffect, useState, useCallback } from "react";
import api from "@/lib/api-client";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import {
  FileText,
  Filter,
  RefreshCw,
  Printer,
  Calendar,
  Building2,
  Users,
  ClipboardCheck,
} from "lucide-react";

interface ReportData {
  overview: {
    totalStudents: number;
    activeStudents: number;
    totalStaff: number;
    activeStaff: number;
    totalClasses: number;
    overallAttendanceRate: string;
  };
  studentsByClass: Array<{
    classId: number;
    className: string;
    level: string;
    section: string | null;
    capacity: number;
    enrolledCount: number;
    occupancyRate: number;
  }>;
  enrollmentsByAcademicYear: Array<{
    academicYearId: number;
    name: string;
    status: string;
    isCurrent: boolean;
    totalEnrollments: number;
  }>;
  attendanceSummary: {
    PRESENT: number;
    ABSENT: number;
    LATE: number;
    EXCUSED: number;
    totalRecords: number;
    attendanceRate: string;
    filter: {
      classId: string | number;
      startDate: string;
      endDate: string;
    };
  };
}

interface ClassOption {
  id: number;
  className: string;
  section: string | null;
}

export default function ReportsPage() {
  const [report, setReport] = useState<ReportData | null>(null);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter criteria for attendance report
  const [classFilter, setClassFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<ReportData>("/api/dashboard/summary", {
        classId: classFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      if (res.data) {
        setReport(res.data);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load report data.");
    } finally {
      setLoading(false);
    }
  }, [classFilter, startDate, endDate]);

  const fetchClasses = async () => {
    try {
      const res = await api.get<ClassOption[]>("/api/classes", { limit: 100 });
      setClasses(res.data || []);
    } catch {
      // fallback
    }
  };

  useEffect(() => {
    fetchReport();
    fetchClasses();
  }, [fetchReport]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Institutional Reports</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Verified institutional summaries: student rosters, classroom occupancy, enrollment, and attendance records
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchReport}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Reload</span>
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {error && <Alert type="error" message={error} />}

      {/* Filter Toolbar for Attendance Range */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            Attendance Criteria:
          </span>

          <div>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Classrooms</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.className} {c.section && `(${c.section})`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="Start Date"
              className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <span className="text-xs text-slate-400">to</span>

          <div>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="End Date"
              className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {(classFilter || startDate || endDate) && (
            <button
              onClick={() => {
                setClassFilter("");
                setStartDate("");
                setEndDate("");
              }}
              className="text-xs text-rose-600 hover:underline px-1"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Report Section 1: Executive Headcount Summary */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-semibold text-slate-900">1. Institutional Headcount Summary</h3>
        </div>
        <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center divide-x divide-slate-100">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Total Enrolled</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{report?.overview.totalStudents || 0}</p>
            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
              {report?.overview.activeStudents || 0} currently active
            </p>
          </div>
          <div className="pl-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Total Staff</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{report?.overview.totalStaff || 0}</p>
            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
              {report?.overview.activeStaff || 0} active faculty
            </p>
          </div>
          <div className="pl-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Classrooms</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{report?.overview.totalClasses || 0}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Preschool to JHS</p>
          </div>
          <div className="pl-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Overall Attendance</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {report?.overview.overallAttendanceRate || "—"}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Current academic term</p>
          </div>
        </div>
      </div>

      {/* Report Section 2: Classroom Occupancy Roster */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-slate-900">2. Classroom Enrollment & Capacity Roster</h3>
          </div>
          <span className="text-xs text-slate-400">Total Classes: {report?.studentsByClass.length || 0}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Classroom</th>
                <th className="px-4 py-3">Level</th>
                <th className="px-4 py-3">Section</th>
                <th className="px-4 py-3 text-right">Max Capacity</th>
                <th className="px-4 py-3 text-right">Active Pupils</th>
                <th className="px-4 py-3 text-right">Available Slots</th>
                <th className="px-5 py-3 text-right">Occupancy Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report?.studentsByClass && report.studentsByClass.length > 0 ? (
                report.studentsByClass.map((cls) => {
                  const available = Math.max(0, cls.capacity - cls.enrolledCount);
                  return (
                    <tr key={cls.classId} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3 font-semibold text-slate-900">{cls.className}</td>
                      <td className="px-4 py-3">
                        <Badge variant="info">{cls.level}</Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{cls.section || "—"}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs">{cls.capacity}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">{cls.enrolledCount}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-slate-600">{available}</td>
                      <td className="px-5 py-3 text-right">
                        <span
                          className={`font-semibold text-xs ${
                            cls.occupancyRate >= 90
                              ? "text-rose-600"
                              : cls.occupancyRate >= 70
                              ? "text-amber-600"
                              : "text-emerald-600"
                          }`}
                        >
                          {cls.occupancyRate}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-xs text-slate-500">
                    No classroom data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Report Section 3: Enrollment Totals by Academic Year */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-purple-600" />
          <h3 className="text-sm font-semibold text-slate-900">3. Enrollment Distribution by Academic Year</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Academic Session</th>
                <th className="px-4 py-3">Session Status</th>
                <th className="px-4 py-3">Current Flag</th>
                <th className="px-5 py-3 text-right">Total Pupil Enrollments</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report?.enrollmentsByAcademicYear && report.enrollmentsByAcademicYear.length > 0 ? (
                report.enrollmentsByAcademicYear.map((ay) => (
                  <tr key={ay.academicYearId} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3 font-semibold text-slate-900">{ay.name}</td>
                    <td className="px-4 py-3 text-xs">
                      <Badge variant={ay.status === "ACTIVE" ? "success" : "neutral"}>{ay.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {ay.isCurrent ? (
                        <span className="font-semibold text-blue-600">Active Current Year</span>
                      ) : (
                        <span className="text-slate-400">Previous / Upcoming</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-slate-900">
                      {ay.totalEnrollments} {ay.totalEnrollments === 1 ? "pupil" : "pupils"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-xs text-slate-500">
                    No academic years found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Report Section 4: Daily Attendance Summary */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
          <ClipboardCheck className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-semibold text-slate-900">4. Attendance Metrics Breakdown</h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
            <span className="text-xs text-emerald-800 font-semibold block uppercase">Present</span>
            <span className="text-xl font-bold text-emerald-700 mt-1 block">
              {report?.attendanceSummary.PRESENT || 0}
            </span>
          </div>

          <div className="p-3 bg-rose-50 rounded-lg border border-rose-100">
            <span className="text-xs text-rose-800 font-semibold block uppercase">Absent</span>
            <span className="text-xl font-bold text-rose-700 mt-1 block">
              {report?.attendanceSummary.ABSENT || 0}
            </span>
          </div>

          <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
            <span className="text-xs text-amber-800 font-semibold block uppercase">Late</span>
            <span className="text-xl font-bold text-amber-700 mt-1 block">
              {report?.attendanceSummary.LATE || 0}
            </span>
          </div>

          <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
            <span className="text-xs text-blue-800 font-semibold block uppercase">Excused</span>
            <span className="text-xl font-bold text-blue-700 mt-1 block">
              {report?.attendanceSummary.EXCUSED || 0}
            </span>
          </div>

          <div className="p-3 bg-slate-100 rounded-lg border border-slate-200 col-span-2 sm:col-span-1">
            <span className="text-xs text-slate-700 font-semibold block uppercase">Total Entries</span>
            <span className="text-xl font-bold text-slate-900 mt-1 block">
              {report?.attendanceSummary.totalRecords || 0}
            </span>
          </div>
        </div>

        <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span>
            Computed Effective Attendance Rate:{" "}
            <strong className="text-slate-900 font-semibold">
              {report?.attendanceSummary.attendanceRate || "100%"}
            </strong>
          </span>
          <span className="text-[11px] text-slate-400">
            Filter applied: Class {report?.attendanceSummary.filter.classId || "all"}, Dates:{" "}
            {report?.attendanceSummary.filter.startDate || "all"} to {report?.attendanceSummary.filter.endDate || "all"}
          </span>
        </div>
      </div>
    </div>
  );
}
