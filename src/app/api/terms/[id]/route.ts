import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { idParamSchema, updateTermSchema } from "@/lib/validators";
import { authorize } from "@/lib/auth";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteParams) {
  try {
    const rawParams = await context.params;
    const { id } = idParamSchema.parse(rawParams);

    const term = await prisma.term.findUnique({
      where: { id },
      include: {
        academicYear: true,
      },
    });

    if (!term) {
      return errorResponse("Term not found", 404);
    }

    return successResponse(term, "Term details retrieved successfully");
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
    const validatedData = updateTermSchema.parse(body);

    const existing = await prisma.term.findUnique({
      where: { id },
      include: { academicYear: true },
    });
    if (!existing) {
      return errorResponse("Term not found", 404);
    }

    const academicYearId = validatedData.academicYearId ?? existing.academicYearId;
    const name = validatedData.name ?? existing.name;

    if (validatedData.name || validatedData.academicYearId) {
      const duplicate = await prisma.term.findFirst({
        where: {
          academicYearId,
          name,
          NOT: { id },
        },
      });
      if (duplicate) {
        return errorResponse("A term with this name already exists in this academic year", 409);
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (validatedData.isCurrent) {
        await tx.term.updateMany({
          where: { academicYearId, NOT: { id } },
          data: { isCurrent: false },
        });
      }

      return tx.term.update({
        where: { id },
        data: validatedData,
      });
    });

    return successResponse(updated, "Term updated successfully");
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

    const existing = await prisma.term.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse("Term not found", 404);
    }

    await prisma.term.delete({
      where: { id },
    });

    return successResponse({ id }, "Term deleted successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
