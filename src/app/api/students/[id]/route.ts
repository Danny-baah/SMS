import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { idParamSchema, updateStudentSchema } from "@/lib/validators";
import { authorize } from "@/lib/auth";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteParams) {
  try {
    const rawParams = await context.params;
    const { id } = idParamSchema.parse(rawParams);

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        guardians: {
          include: {
            guardian: true,
          },
        },
        enrollments: {
          orderBy: { enrollmentDate: "desc" },
          include: {
            schoolClass: true,
            academicYear: true,
          },
        },
        attendances: {
          take: 30,
          orderBy: { date: "desc" },
        },
      },
    });

    if (!student) {
      return errorResponse("Student not found", 404);
    }

    return successResponse(student, "Student details retrieved successfully");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteParams) {
  try {
    const auth = authorize(request, ["ADMIN", "HEAD_TEACHER", "STAFF"]);
    if (auth.response) return auth.response;

    const rawParams = await context.params;
    const { id } = idParamSchema.parse(rawParams);

    const body = await request.json();
    const validatedData = updateStudentSchema.parse(body);

    const existingStudent = await prisma.student.findUnique({ where: { id } });
    if (!existingStudent) {
      return errorResponse("Student not found", 404);
    }

    if (validatedData.admissionNumber && validatedData.admissionNumber !== existingStudent.admissionNumber) {
      const duplicateAdmission = await prisma.student.findUnique({
        where: { admissionNumber: validatedData.admissionNumber },
      });
      if (duplicateAdmission) {
        return errorResponse("Admission number is already in use by another student", 409);
      }
    }

    const updatedStudent = await prisma.student.update({
      where: { id },
      data: validatedData,
    });

    return successResponse(updatedStudent, "Student updated successfully");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, context: RouteParams) {
  return PATCH(request, context);
}

export async function DELETE(request: NextRequest, context: RouteParams) {
  try {
    const auth = authorize(request, ["ADMIN", "HEAD_TEACHER"]);
    if (auth.response) return auth.response;

    const rawParams = await context.params;
    const { id } = idParamSchema.parse(rawParams);

    const existing = await prisma.student.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse("Student not found", 404);
    }

    await prisma.student.delete({
      where: { id },
    });

    return successResponse({ id }, "Student deleted successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
