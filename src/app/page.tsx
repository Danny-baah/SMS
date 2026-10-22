"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api-client";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import {
  GraduationCap,
  Briefcase,
  Building2,
  ClipboardCheck,
  ArrowRight,
  RefreshCw,
  Users2,
  Calendar,
  BookOpen,
  UserCheck,
} from "lucide-react";

interface DashboardData {
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
  };
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<DashboardData>("/api/dashboard/summary");
      if (res.data) {
        setData(res.data);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard summary data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">System Overview</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time status of students, staff, class allocations, and attendance records
          </p>
        </div>
        <button
          onClick={fetchSummary}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Data
        </button>
      </div>

      {error && <Alert type="error" message={error} />}

      {/* Core Operational Statistics */}
      {loading && !data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-white rounded-xl border border-slate-200 p-4 animate-pulse" />
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Students</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-slate-900">{data.overview.totalStudents}</span>
                <span className="text-xs text-emerald-600 font-medium">
                  {data.overview.activeStudents} active
                </span>
              </div>
            </div>
            <div className="p-3 bg-blue-50 text-blue-700 rounded-lg">
              <GraduationCap className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Staff Members</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-slate-900">{data.overview.totalStaff}</span>
                <span className="text-xs text-emerald-600 font-medium">
                  {data.overview.activeStaff} active
                </span>
              </div>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg">
              <Briefcase className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Active Classes</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-slate-900">{data.overview.totalClasses}</span>
                <span className="text-xs text-slate-500 font-normal">Preschool to JHS</span>
              </div>
            </div>
            <div className="p-3 bg-amber-50 text-amber-700 rounded-lg">
              <Building2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Attendance Rate</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-slate-900">
                  {data.overview.overallAttendanceRate}
                </span>
                <span className="text-xs text-slate-500">
                  ({data.attendanceSummary.totalRecords} logged)
                </span>
              </div>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-700 rounded-lg">
              <ClipboardCheck className="w-6 h-6" />
            </div>
          </div>
        </div>
      ) : null}

      {/* Grid: Class Distribution & Quick Navigation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Class Enrollment Breakdown */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Class Enrolment & Capacity</h3>
              <p className="text-xs text-slate-500">Enrolled pupils vs maximum classroom capacity</p>
            </div>
            <Link
              href="/classes"
              className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              Manage Classes <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Class Name</th>
                  <th className="px-4 py-3">Level</th>
                  <th className="px-4 py-3">Section</th>
                  <th className="px-4 py-3 text-right">Enrolled</th>
                  <th className="px-4 py-3 text-right">Capacity</th>
                  <th className="px-5 py-3 text-right">Occupancy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.studentsByClass && data.studentsByClass.length > 0 ? (
                  data.studentsByClass.map((cls) => (
                    <tr key={cls.classId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3 font-medium text-slate-900">{cls.className}</td>
                      <td className="px-4 py-3">
                        <Badge variant="info">{cls.level}</Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{cls.section || "—"}</td>
                      <td className="px-4 py-3 text-right font-medium">{cls.enrolledCount}</td>
                      <td className="px-4 py-3 text-right text-slate-500">{cls.capacity}</td>
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
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-xs text-slate-500">
                      No classes configured yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Academic Year Status & Quick Links */}
        <div className="space-y-6">
          {/* Academic Years Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h3 className="text-sm font-semibold text-slate-900">Academic Years</h3>
              <Link href="/academic-years" className="text-xs text-blue-600 hover:underline">
                View All
              </Link>
            </div>
            <div className="space-y-2.5">
              {data?.enrollmentsByAcademicYear && data.enrollmentsByAcademicYear.length > 0 ? (
                data.enrollmentsByAcademicYear.map((ay) => (
                  <div
                    key={ay.academicYearId}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200/60 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-900">{ay.name}</span>
                      {ay.isCurrent && (
                        <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-medium">
                          Current
                        </span>
                      )}
                    </div>
                    <span className="text-slate-600 font-medium">
                      {ay.totalEnrollments} {ay.totalEnrollments === 1 ? "student" : "students"}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 py-3 text-center">No academic years found.</p>
              )}
            </div>
          </div>

          {/* Quick Management Shortcuts */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-900 pb-3 border-b border-slate-100 mb-3">
              Direct Management
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/students"
                className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
              >
                <GraduationCap className="w-4 h-4 text-blue-600" />
                <span>Students</span>
              </Link>
              <Link
                href="/guardians"
                className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
              >
                <Users2 className="w-4 h-4 text-emerald-600" />
                <span>Guardians</span>
              </Link>
              <Link
                href="/enrollments"
                className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
              >
                <UserCheck className="w-4 h-4 text-indigo-600" />
                <span>Enrollment</span>
              </Link>
              <Link
                href="/attendance"
                className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
              >
                <ClipboardCheck className="w-4 h-4 text-amber-600" />
                <span>Attendance</span>
              </Link>
              <Link
                href="/subjects"
                className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
              >
                <BookOpen className="w-4 h-4 text-purple-600" />
                <span>Subjects</span>
              </Link>
              <Link
                href="/reports"
                className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
              >
                <Calendar className="w-4 h-4 text-rose-600" />
                <span>Reports</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
