import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { idParamSchema, updateEnrollmentSchema } from "@/lib/validators";
import { authorize } from "@/lib/auth";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteParams) {
  try {
    const rawParams = await context.params;
    const { id } = idParamSchema.parse(rawParams);

    const enrollment = await prisma.enrollment.findUnique({
      where: { id },
      include: {
        student: true,
        schoolClass: true,
        academicYear: true,
      },
    });

    if (!enrollment) {
      return errorResponse("Enrollment not found", 404);
    }

    return successResponse(enrollment, "Enrollment retrieved successfully");
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
    const validatedData = updateEnrollmentSchema.parse(body);

    const existing = await prisma.enrollment.findUnique({
      where: { id },
      include: { schoolClass: true },
    });
    if (!existing) {
      return errorResponse("Enrollment not found", 404);
    }

    // Handle student transfer: If class is being changed
    if (validatedData.schoolClassId && validatedData.schoolClassId !== existing.schoolClassId) {
      const targetClass = await prisma.schoolClass.findUnique({
        where: { id: validatedData.schoolClassId },
        include: {
          _count: {
            where: { enrollments: { status: "ENROLLED", academicYearId: existing.academicYearId } },
            select: { enrollments: true },
          },
        },
      });
      if (!targetClass) {
        return errorResponse("Target school class not found", 404);
      }
      if (targetClass._count.enrollments >= targetClass.capacity) {
        return errorResponse("Target school class capacity reached", 400);
      }
    }

    const updated = await prisma.enrollment.update({
      where: { id },
      data: validatedData,
      include: {
        student: true,
        schoolClass: true,
        academicYear: true,
      },
    });

    return successResponse(updated, "Enrollment updated successfully");
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

    const existing = await prisma.enrollment.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse("Enrollment not found", 404);
    }

    // Instead of raw deletion, preserve historical records by setting status to WITHDRAWN or delete if requested
    const updated = await prisma.enrollment.update({
      where: { id },
      data: { status: "WITHDRAWN" },
    });

    return successResponse(updated, "Enrollment marked as WITHDRAWN to preserve historical records");
  } catch (error) {
    return handleApiError(error);
  }
}
