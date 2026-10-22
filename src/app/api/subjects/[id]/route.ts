import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { idParamSchema, updateSubjectSchema } from "@/lib/validators";
import { authorize } from "@/lib/auth";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteParams) {
  try {
    const rawParams = await context.params;
    const { id } = idParamSchema.parse(rawParams);

    const subject = await prisma.subject.findUnique({
      where: { id },
      include: {
        classes: {
          include: {
            schoolClass: true,
            teacher: true,
          },
        },
      },
    });

    if (!subject) {
      return errorResponse("Subject not found", 404);
    }

    return successResponse(subject, "Subject details retrieved successfully");
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
    const validatedData = updateSubjectSchema.parse(body);

    const existing = await prisma.subject.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse("Subject not found", 404);
    }

    if (validatedData.subjectCode && validatedData.subjectCode !== existing.subjectCode) {
      const duplicate = await prisma.subject.findUnique({
        where: { subjectCode: validatedData.subjectCode },
      });
      if (duplicate) return errorResponse("Subject code already in use", 409);
    }

    const updated = await prisma.subject.update({
      where: { id },
      data: validatedData,
    });

    return successResponse(updated, "Subject updated successfully");
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

    const existing = await prisma.subject.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse("Subject not found", 404);
    }

    await prisma.subject.delete({
      where: { id },
    });

    return successResponse({ id }, "Subject deleted successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
