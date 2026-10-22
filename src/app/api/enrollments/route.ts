import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { createEnrollmentSchema, enrollmentQuerySchema } from "@/lib/validators";
import { authorize } from "@/lib/auth";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = enrollmentQuerySchema.parse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      sortBy: searchParams.get("sortBy") ?? undefined,
      sortOrder: searchParams.get("sortOrder") ?? undefined,
      studentId: searchParams.get("studentId") ?? undefined,
      schoolClassId: searchParams.get("schoolClassId") ?? undefined,
      academicYearId: searchParams.get("academicYearId") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    });

    const where: any = {};
    if (query.studentId) where.studentId = query.studentId;
    if (query.schoolClassId) where.schoolClassId = query.schoolClassId;
    if (query.academicYearId) where.academicYearId = query.academicYearId;
    if (query.status) where.status = query.status;
    if (query.search) {
      where.student = {
        OR: [
          { firstName: { contains: query.search } },
          { lastName: { contains: query.search } },
          { admissionNumber: { contains: query.search } },
        ],
      };
    }

    const skip = (query.page - 1) * query.limit;
    const take = query.limit;

    const [total, enrollments] = await Promise.all([
      prisma.enrollment.count({ where }),
      prisma.enrollment.findMany({
        where,
        skip,
        take,
        orderBy: query.sortBy ? { [query.sortBy]: query.sortOrder } : { enrollmentDate: "desc" },
        include: {
          student: {
            select: {
              id: true,
              admissionNumber: true,
              firstName: true,
              lastName: true,
              status: true,
            },
          },
          schoolClass: {
            select: {
              id: true,
              className: true,
              level: true,
              section: true,
            },
          },
          academicYear: {
            select: {
              id: true,
              name: true,
              isCurrent: true,
            },
          },
        },
      }),
    ]);

    return successResponse(enrollments, "Enrollments retrieved successfully", 200, {
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
    const auth = authorize(request, ["ADMIN", "HEAD_TEACHER", "STAFF"]);
    if (auth.response) return auth.response;

    const body = await request.json();
    const validatedData = createEnrollmentSchema.parse(body);

    // Verify student exists
    const student = await prisma.student.findUnique({
      where: { id: validatedData.studentId },
    });
    if (!student) {
      return errorResponse("Student not found", 404);
    }

    // Verify class exists and check capacity
    const schoolClass = await prisma.schoolClass.findUnique({
      where: { id: validatedData.schoolClassId },
      include: {
        _count: {
          where: { enrollments: { status: "ENROLLED", academicYearId: validatedData.academicYearId } },
          select: { enrollments: true },
        },
      },
    });
    if (!schoolClass) {
      return errorResponse("School class not found", 404);
    }

    if (schoolClass._count.enrollments >= schoolClass.capacity) {
      return errorResponse(
        `Class capacity reached (${schoolClass._count.enrollments}/${schoolClass.capacity}).`,
        400
      );
    }

    // Verify academic year exists
    const academicYear = await prisma.academicYear.findUnique({
      where: { id: validatedData.academicYearId },
    });
    if (!academicYear) {
      return errorResponse("Academic year not found", 404);
    }

    // Check duplicate enrollment for this academic year
    const existing = await prisma.enrollment.findUnique({
      where: {
        unique_student_class_year_enrollment: {
          studentId: validatedData.studentId,
          schoolClassId: validatedData.schoolClassId,
          academicYearId: validatedData.academicYearId,
        },
      },
    });
    if (existing) {
      return errorResponse("Student is already enrolled in this class for this academic year.", 409);
    }

    const newEnrollment = await prisma.enrollment.create({
      data: validatedData,
      include: {
        student: true,
        schoolClass: true,
        academicYear: true,
      },
    });

    return successResponse(newEnrollment, "Student enrolled successfully", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
