import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { idParamSchema, updateSchoolClassSchema } from "@/lib/validators";
import { authorize } from "@/lib/auth";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteParams) {
  try {
    const rawParams = await context.params;
    const { id } = idParamSchema.parse(rawParams);

    const schoolClass = await prisma.schoolClass.findUnique({
      where: { id },
      include: {
        classTeacher: true,
        subjects: {
          include: {
            subject: true,
            teacher: true,
          },
        },
        enrollments: {
          where: { status: "ENROLLED" },
          include: {
            student: true,
          },
        },
      },
    });

    if (!schoolClass) {
      return errorResponse("School class not found", 404);
    }

    return successResponse(schoolClass, "Class details retrieved successfully");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteParams) {
  try {
    const auth = authorize(request, ["ADMIN", "HEAD_TEACHER"]);
    if (auth.response) return auth.response;

    const rawParams = await context.params;
    const { id } = idParamSchema.parse(rawParams);

    const body = await request.json();
    const validatedData = updateSchoolClassSchema.parse(body);

    const existing = await prisma.schoolClass.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse("School class not found", 404);
    }

    if (validatedData.className || validatedData.section !== undefined) {
      const checkName = validatedData.className ?? existing.className;
      const checkSection = validatedData.section !== undefined ? validatedData.section : existing.section;

      const duplicate = await prisma.schoolClass.findFirst({
        where: {
          className: checkName,
          section: checkSection,
          NOT: { id },
        },
      });
      if (duplicate) {
        return errorResponse("A class with this name and section already exists", 409);
      }
    }

    if (validatedData.classTeacherId) {
      const teacher = await prisma.staff.findUnique({
        where: { id: validatedData.classTeacherId },
      });
      if (!teacher) return errorResponse("Assigned teacher not found", 404);
    }

    const updated = await prisma.schoolClass.update({
      where: { id },
      data: validatedData,
      include: { classTeacher: true },
    });

    return successResponse(updated, "Class updated successfully");
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

    const existing = await prisma.schoolClass.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse("School class not found", 404);
    }

    // Check if class has active enrollments
    const activeEnrollments = await prisma.enrollment.count({
      where: { schoolClassId: id, status: "ENROLLED" },
    });
    if (activeEnrollments > 0) {
      return errorResponse("Cannot delete class with active student enrollments. Transfer or archive them first.", 400);
    }

    await prisma.schoolClass.delete({
      where: { id },
    });

    return successResponse({ id }, "School class deleted successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
