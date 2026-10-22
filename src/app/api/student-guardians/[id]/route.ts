import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { idParamSchema, updateStudentGuardianSchema } from "@/lib/validators";
import { authorize } from "@/lib/auth";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteParams) {
  try {
    const rawParams = await context.params;
    const { id } = idParamSchema.parse(rawParams);

    const link = await prisma.studentGuardian.findUnique({
      where: { id },
      include: {
        student: true,
        guardian: true,
      },
    });

    if (!link) {
      return errorResponse("Student-Guardian link not found", 404);
    }

    return successResponse(link, "Student-Guardian link retrieved successfully");
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
    const validatedData = updateStudentGuardianSchema.parse(body);

    const existing = await prisma.studentGuardian.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse("Student-Guardian link not found", 404);
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (validatedData.isPrimary) {
        await tx.studentGuardian.updateMany({
          where: { studentId: existing.studentId },
          data: { isPrimary: false },
        });
      }

      return tx.studentGuardian.update({
        where: { id },
        data: validatedData,
        include: {
          student: true,
          guardian: true,
        },
      });
    });

    return successResponse(updated, "Student-Guardian link updated successfully");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteParams) {
  try {
    const auth = authorize(request, ["ADMIN", "HEAD_TEACHER"]);
    if (auth.response) return auth.response;

    const rawParams = await context.params;
    const { id } = idParamSchema.parse(rawParams);

    const existing = await prisma.studentGuardian.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse("Student-Guardian link not found", 404);
    }

    await prisma.studentGuardian.delete({
      where: { id },
    });

    return successResponse({ id }, "Student-Guardian link removed successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
