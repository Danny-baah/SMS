import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { markAttendanceRecordSchema, bulkAttendanceSchema, attendanceQuerySchema } from "@/lib/validators";
import { authorize } from "@/lib/auth";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = attendanceQuerySchema.parse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      sortBy: searchParams.get("sortBy") ?? undefined,
      sortOrder: searchParams.get("sortOrder") ?? undefined,
      studentId: searchParams.get("studentId") ?? undefined,
      schoolClassId: searchParams.get("schoolClassId") ?? undefined,
      startDate: searchParams.get("startDate") ?? undefined,
      endDate: searchParams.get("endDate") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    });

    const where: any = {};
    if (query.studentId) where.studentId = query.studentId;
    if (query.schoolClassId) where.schoolClassId = query.schoolClassId;
    if (query.status) where.status = query.status;
    if (query.startDate || query.endDate) {
      where.date = {
        ...(query.startDate ? { gte: query.startDate } : {}),
        ...(query.endDate ? { lte: query.endDate } : {}),
      };
    }

    const skip = (query.page - 1) * query.limit;
    const take = query.limit;

    const [total, records] = await Promise.all([
      prisma.attendance.count({ where }),
      prisma.attendance.findMany({
        where,
        skip,
        take,
        orderBy: query.sortBy ? { [query.sortBy]: query.sortOrder } : { date: "desc" },
        include: {
          student: {
            select: { id: true, admissionNumber: true, firstName: true, lastName: true },
          },
          schoolClass: {
            select: { id: true, className: true, level: true, section: true },
          },
          recordedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
    ]);

    return successResponse(records, "Attendance records retrieved successfully", 200, {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = authorize(request, ["ADMIN", "HEAD_TEACHER", "TEACHER", "STAFF"]);
    if (auth.response) return auth.response;

    const body = await request.json();

    // Check if bulk attendance request
    if (body.records && Array.isArray(body.records)) {
      const validated = bulkAttendanceSchema.parse(body);

      const targetClass = await prisma.schoolClass.findUnique({
        where: { id: validated.schoolClassId },
      });
      if (!targetClass) {
        return errorResponse("School class not found", 404);
      }

      // Upsert attendance for each student in the class on this date using transaction
      const results = await prisma.$transaction(
        validated.records.map((rec) =>
          prisma.attendance.upsert({
            where: {
              unique_student_daily_attendance: {
                studentId: rec.studentId,
                date: validated.date,
              },
            },
            create: {
              studentId: rec.studentId,
              schoolClassId: validated.schoolClassId,
              date: validated.date,
              status: rec.status,
              remarks: rec.remarks || null,
              recordedById: validated.recordedById || (auth.user?.id ? auth.user.id : null),
            },
            update: {
              status: rec.status,
              remarks: rec.remarks || null,
              recordedById: validated.recordedById || (auth.user?.id ? auth.user.id : null),
            },
          })
        )
      );

      return successResponse(results, `${results.length} attendance records processed successfully`, 201);
    }

    // Single attendance record
    const validatedData = markAttendanceRecordSchema.parse(body);

    const record = await prisma.attendance.upsert({
      where: {
        unique_student_daily_attendance: {
          studentId: validatedData.studentId,
          date: validatedData.date,
        },
      },
      create: {
        ...validatedData,
        recordedById: validatedData.recordedById || (auth.user?.id ? auth.user.id : null),
      },
      update: {
        status: validatedData.status,
        remarks: validatedData.remarks || null,
        recordedById: validatedData.recordedById || (auth.user?.id ? auth.user.id : null),
      },
    });

    return successResponse(record, "Attendance record saved successfully", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
