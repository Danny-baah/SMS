import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { successResponse, handleApiError } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const classIdParam = searchParams.get("classId");

    const startDate = startDateParam ? new Date(startDateParam) : undefined;
    const endDate = endDateParam ? new Date(endDateParam) : undefined;
    const classId = classIdParam ? parseInt(classIdParam, 10) : undefined;

    // 1. Total active and total overall students
    const [totalStudents, activeStudents] = await Promise.all([
      prisma.student.count(),
      prisma.student.count({ where: { status: "ACTIVE" } }),
    ]);

    // 2. Total active and total overall staff
    const [totalStaff, activeStaff] = await Promise.all([
      prisma.staff.count(),
      prisma.staff.count({ where: { employmentStatus: "ACTIVE" } }),
    ]);

    // 3. Students grouped by class (with level and capacity metrics)
    const classes = await prisma.schoolClass.findMany({
      include: {
        _count: {
          select: {
            enrollments: {
              where: { status: "ENROLLED" },
            },
          },
        },
      },
      orderBy: [{ level: "asc" }, { className: "asc" }],
    });

    const studentsByClass = classes.map((c) => ({
      classId: c.id,
      className: c.className,
      level: c.level,
      section: c.section,
      capacity: c.capacity,
      enrolledCount: c._count.enrollments,
      occupancyRate: c.capacity > 0 ? Number(((c._count.enrollments / c.capacity) * 100).toFixed(1)) : 0,
    }));

    // 4. Enrollment totals grouped by academic year
    const academicYears = await prisma.academicYear.findMany({
      include: {
        _count: {
          select: { enrollments: true },
        },
      },
      orderBy: { startDate: "desc" },
    });

    const enrollmentsByAcademicYear = academicYears.map((ay) => ({
      academicYearId: ay.id,
      name: ay.name,
      status: ay.status,
      isCurrent: ay.isCurrent,
      totalEnrollments: ay._count.enrollments,
    }));

    // 5. Attendance summaries by status (optionally filtered by date range and class)
    const attendanceWhere: any = {};
    if (classId) attendanceWhere.schoolClassId = classId;
    if (startDate || endDate) {
      attendanceWhere.date = {
        ...(startDate ? { gte: startDate } : {}),
        ...(endDate ? { lte: endDate } : {}),
      };
    }

    const attendanceGrouped = await prisma.attendance.groupBy({
      by: ["status"],
      where: attendanceWhere,
      _count: {
        id: true,
      },
    });

    const attendanceSummary = {
      PRESENT: 0,
      ABSENT: 0,
      LATE: 0,
      EXCUSED: 0,
      totalRecords: 0,
    };

    for (const item of attendanceGrouped) {
      attendanceSummary[item.status] = item._count.id;
      attendanceSummary.totalRecords += item._count.id;
    }

    const attendanceRate =
      attendanceSummary.totalRecords > 0
        ? Number((((attendanceSummary.PRESENT + attendanceSummary.LATE) / attendanceSummary.totalRecords) * 100).toFixed(1))
        : 100;

    return successResponse(
      {
        overview: {
          totalStudents,
          activeStudents,
          totalStaff,
          activeStaff,
          totalClasses: classes.length,
          overallAttendanceRate: `${attendanceRate}%`,
        },
        studentsByClass,
        enrollmentsByAcademicYear,
        attendanceSummary: {
          ...attendanceSummary,
          attendanceRate: `${attendanceRate}%`,
          filter: {
            classId: classId || "all",
            startDate: startDateParam || "all",
            endDate: endDateParam || "all",
          },
        },
      },
      "Dashboard report summary retrieved successfully"
    );
  } catch (error) {
    return handleApiError(error);
  }
}
