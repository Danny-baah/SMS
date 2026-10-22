import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { createStudentGuardianSchema } from "@/lib/validators";
import { authorize } from "@/lib/auth";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");
    const guardianId = searchParams.get("guardianId");

    const where: any = {};
    if (studentId) where.studentId = parseInt(studentId, 10);
    if (guardianId) where.guardianId = parseInt(guardianId, 10);

    const links = await prisma.studentGuardian.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            admissionNumber: true,
            firstName: true,
            lastName: true,
            status: true,
          },
        },
        guardian: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true,
            relationship: true,
          },
        },
      },
    });

    return successResponse(links, "Student-Guardian relationships retrieved successfully");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = authorize(request, ["ADMIN", "HEAD_TEACHER", "STAFF"]);
    if (auth.response) return auth.response;

    const body = await request.json();
    const validatedData = createStudentGuardianSchema.parse(body);

    // Verify student exists
    const student = await prisma.student.findUnique({
      where: { id: validatedData.studentId },
    });
    if (!student) {
      return errorResponse("Student does not exist", 404);
    }

    // Verify guardian exists
    const guardian = await prisma.guardian.findUnique({
      where: { id: validatedData.guardianId },
    });
    if (!guardian) {
      return errorResponse("Guardian does not exist", 404);
    }

    // Check unique constraint
    const existing = await prisma.studentGuardian.findUnique({
      where: {
        unique_student_guardian: {
          studentId: validatedData.studentId,
          guardianId: validatedData.guardianId,
        },
      },
    });
    if (existing) {
      return errorResponse("This student is already linked to this guardian", 409);
    }

    // If isPrimary is true, optionally reset other primary flags for this student in a transaction
    const link = await prisma.$transaction(async (tx) => {
      if (validatedData.isPrimary) {
        await tx.studentGuardian.updateMany({
          where: { studentId: validatedData.studentId },
          data: { isPrimary: false },
        });
      }

      return tx.studentGuardian.create({
        data: validatedData,
        include: {
          student: true,
          guardian: true,
        },
      });
    });

    return successResponse(link, "Student-Guardian link created successfully", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
