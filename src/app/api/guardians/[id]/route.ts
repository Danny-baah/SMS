import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { idParamSchema, updateGuardianSchema } from "@/lib/validators";
import { authorize } from "@/lib/auth";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteParams) {
  try {
    const rawParams = await context.params;
    const { id } = idParamSchema.parse(rawParams);

    const guardian = await prisma.guardian.findUnique({
      where: { id },
      include: {
        students: {
          include: {
            student: true,
          },
        },
      },
    });

    if (!guardian) {
      return errorResponse("Guardian not found", 404);
    }

    return successResponse(guardian, "Guardian details retrieved successfully");
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
    const validatedData = updateGuardianSchema.parse(body);

    const existing = await prisma.guardian.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse("Guardian not found", 404);
    }

    const updatedGuardian = await prisma.guardian.update({
      where: { id },
      data: {
        ...validatedData,
        email: validatedData.email !== undefined ? (validatedData.email || null) : undefined,
      },
    });

    return successResponse(updatedGuardian, "Guardian updated successfully");
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

    const existing = await prisma.guardian.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse("Guardian not found", 404);
    }

    await prisma.guardian.delete({
      where: { id },
    });

    return successResponse({ id }, "Guardian deleted successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
