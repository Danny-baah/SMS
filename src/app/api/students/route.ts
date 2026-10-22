import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { createStudentSchema, studentQuerySchema } from "@/lib/validators";
import { authorize } from "@/lib/auth";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = studentQuerySchema.parse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      sortBy: searchParams.get("sortBy") ?? undefined,
      sortOrder: searchParams.get("sortOrder") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      sex: searchParams.get("sex") ?? undefined,
      classId: searchParams.get("classId") ?? undefined,
      academicYearId: searchParams.get("academicYearId") ?? undefined,
    });

    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }
    if (query.sex) {
      where.sex = query.sex;
    }
    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search } },
        { lastName: { contains: query.search } },
        { admissionNumber: { contains: query.search } },
      ];
    }
    if (query.classId || query.academicYearId) {
      where.enrollments = {
        some: {
          ...(query.classId ? { schoolClassId: query.classId } : {}),
          ...(query.academicYearId ? { academicYearId: query.academicYearId } : {}),
        },
      };
    }

    const skip = (query.page - 1) * query.limit;
    const take = query.limit;

    const [total, students] = await Promise.all([
      prisma.student.count({ where }),
      prisma.student.findMany({
        where,
        skip,
        take,
        orderBy: query.sortBy ? { [query.sortBy]: query.sortOrder } : { createdAt: "desc" },
        include: {
          enrollments: {
            take: 1,
            orderBy: { createdAt: "desc" },
            include: {
              schoolClass: { select: { id: true, className: true, level: true, section: true } },
              academicYear: { select: { id: true, name: true, isCurrent: true } },
            },
          },
          guardians: {
            include: {
              guardian: { select: { id: true, fullName: true, phone: true, relationship: true } },
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / query.limit);

    return successResponse(students, "Students retrieved successfully", 200, {
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
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
    const validatedData = createStudentSchema.parse(body);

    const existingAdmission = await prisma.student.findUnique({
      where: { admissionNumber: validatedData.admissionNumber },
    });
    if (existingAdmission) {
      return errorResponse("Admission number is already in use.", 409, [
        { field: "admissionNumber", message: "Admission number must be unique" },
      ]);
    }

    const newStudent = await prisma.student.create({
      data: validatedData,
    });

    return successResponse(newStudent, "Student created successfully", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
