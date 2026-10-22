import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { idParamSchema, updateAttendanceSchema } from "@/lib/validators";
import { authorize } from "@/lib/auth";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteParams) {
  try {
    const rawParams = await context.params;
    const { id } = idParamSchema.parse(rawParams);

    const record = await prisma.attendance.findUnique({
      where: { id },
      include: {
        student: true,
        schoolClass: true,
        recordedBy: true,
      },
    });

    if (!record) {
      return errorResponse("Attendance record not found", 404);
    }

    return successResponse(record, "Attendance record retrieved successfully");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteParams) {
  try {
    const auth = authorize(request, ["ADMIN", "HEAD_TEACHER", "TEACHER", "STAFF"]);
    if (auth.response) return auth.response;

    const rawParams = await context.params;
    const { id } = idParamSchema.parse(rawParams);

    const body = await request.json();
    const validatedData = updateAttendanceSchema.parse(body);

    const existing = await prisma.attendance.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse("Attendance record not found", 404);
    }

    const updated = await prisma.attendance.update({
      where: { id },
      data: validatedData,
    });

    return successResponse(updated, "Attendance record updated successfully");
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

    const existing = await prisma.attendance.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse("Attendance record not found", 404);
    }

    await prisma.attendance.delete({
      where: { id },
    });

    return successResponse({ id }, "Attendance record deleted successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
