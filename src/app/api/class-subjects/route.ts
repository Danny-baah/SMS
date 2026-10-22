import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { assignClassSubjectSchema } from "@/lib/validators";
import { authorize } from "@/lib/auth";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolClassId = searchParams.get("schoolClassId");
    const subjectId = searchParams.get("subjectId");
    const teacherId = searchParams.get("teacherId");

    const where: any = {};
    if (schoolClassId) where.schoolClassId = parseInt(schoolClassId, 10);
    if (subjectId) where.subjectId = parseInt(subjectId, 10);
    if (teacherId) where.teacherId = parseInt(teacherId, 10);

    const assignments = await prisma.classSubject.findMany({
      where,
      include: {
        schoolClass: true,
        subject: true,
        teacher: {
          select: { id: true, firstName: true, lastName: true, staffNumber: true, email: true },
        },
      },
    });

    return successResponse(assignments, "Class-Subject assignments retrieved successfully");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = authorize(request, ["ADMIN", "HEAD_TEACHER"]);
    if (auth.response) return auth.response;

    const body = await request.json();
    const validatedData = assignClassSubjectSchema.parse(body);

    const targetClass = await prisma.schoolClass.findUnique({ where: { id: validatedData.schoolClassId } });
    if (!targetClass) return errorResponse("School class not found", 404);

    const targetSubject = await prisma.subject.findUnique({ where: { id: validatedData.subjectId } });
    if (!targetSubject) return errorResponse("Subject not found", 404);

    if (validatedData.teacherId) {
      const teacher = await prisma.staff.findUnique({ where: { id: validatedData.teacherId } });
      if (!teacher) return errorResponse("Teacher not found", 404);
    }

    const assignment = await prisma.classSubject.upsert({
      where: {
        unique_class_subject: {
          schoolClassId: validatedData.schoolClassId,
          subjectId: validatedData.subjectId,
        },
      },
      create: validatedData,
      update: {
        teacherId: validatedData.teacherId || null,
      },
      include: {
        schoolClass: true,
        subject: true,
        teacher: true,
      },
    });

    return successResponse(assignment, "Subject assigned to class successfully", 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = authorize(request, ["ADMIN", "HEAD_TEACHER"]);
    if (auth.response) return auth.response;

    const { searchParams } = new URL(request.url);
    const schoolClassId = searchParams.get("schoolClassId");
    const subjectId = searchParams.get("subjectId");

    if (!schoolClassId || !subjectId) {
      return errorResponse("Both schoolClassId and subjectId are required for unassigning", 400);
    }

    await prisma.classSubject.delete({
      where: {
        unique_class_subject: {
          schoolClassId: parseInt(schoolClassId, 10),
          subjectId: parseInt(subjectId, 10),
        },
      },
    });

    return successResponse(null, "Subject unassigned from class successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
