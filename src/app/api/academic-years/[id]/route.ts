import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { idParamSchema, updateAcademicYearSchema } from "@/lib/validators";
import { authorize } from "@/lib/auth";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteParams) {
  try {
    const rawParams = await context.params;
    const { id } = idParamSchema.parse(rawParams);

    const academicYear = await prisma.academicYear.findUnique({
      where: { id },
      include: {
        terms: {
          orderBy: { startDate: "asc" },
        },
        enrollments: {
          take: 50,
          include: {
            student: true,
            schoolClass: true,
          },
        },
      },
    });

    if (!academicYear) {
      return errorResponse("Academic year not found", 404);
    }

    return successResponse(academicYear, "Academic year details retrieved successfully");
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
    const validatedData = updateAcademicYearSchema.parse(body);

    const existing = await prisma.academicYear.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse("Academic year not found", 404);
    }

    if (validatedData.name && validatedData.name !== existing.name) {
      const duplicate = await prisma.academicYear.findUnique({
        where: { name: validatedData.name },
      });
      if (duplicate) return errorResponse("Academic year name already exists", 409);
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (validatedData.isCurrent) {
        await tx.academicYear.updateMany({
          where: { NOT: { id } },
          data: { isCurrent: false },
        });
      }

      return tx.academicYear.update({
        where: { id },
        data: validatedData,
      });
    });

    return successResponse(updated, "Academic year updated successfully");
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

    const existing = await prisma.academicYear.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse("Academic year not found", 404);
    }

    const enrollmentCount = await prisma.enrollment.count({
      where: { academicYearId: id },
    });
    if (enrollmentCount > 0) {
      return errorResponse("Cannot delete academic year with existing enrollments.", 400);
    }

    await prisma.academicYear.delete({
      where: { id },
    });

    return successResponse({ id }, "Academic year deleted successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
