import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { idParamSchema, updateStaffSchema } from "@/lib/validators";
import { authorize } from "@/lib/auth";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteParams) {
  try {
    const rawParams = await context.params;
    const { id } = idParamSchema.parse(rawParams);

    const staffMember = await prisma.staff.findUnique({
      where: { id },
      include: {
        classesAsTeacher: true,
        subjectAssignments: {
          include: {
            schoolClass: true,
            subject: true,
          },
        },
        user: {
          select: {
            id: true,
            username: true,
            role: true,
            isActive: true,
          },
        },
      },
    });

    if (!staffMember) {
      return errorResponse("Staff member not found", 404);
    }

    return successResponse(staffMember, "Staff details retrieved successfully");
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
    const validatedData = updateStaffSchema.parse(body);

    const existing = await prisma.staff.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse("Staff member not found", 404);
    }

    if (validatedData.staffNumber && validatedData.staffNumber !== existing.staffNumber) {
      const duplicate = await prisma.staff.findUnique({
        where: { staffNumber: validatedData.staffNumber },
      });
      if (duplicate) return errorResponse("Staff number is already in use", 409);
    }

    if (validatedData.email && validatedData.email !== existing.email) {
      const duplicate = await prisma.staff.findUnique({
        where: { email: validatedData.email },
      });
      if (duplicate) return errorResponse("Staff email is already in use", 409);
    }

    const updated = await prisma.staff.update({
      where: { id },
      data: validatedData,
    });

    return successResponse(updated, "Staff member updated successfully");
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

    const existing = await prisma.staff.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse("Staff member not found", 404);
    }

    await prisma.staff.delete({
      where: { id },
    });

    return successResponse({ id }, "Staff member deleted successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
