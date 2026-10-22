import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { createAcademicYearSchema } from "@/lib/validators";
import { authorize } from "@/lib/auth";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

export async function GET() {
  try {
    const academicYears = await prisma.academicYear.findMany({
      orderBy: { startDate: "desc" },
      include: {
        terms: {
          orderBy: { startDate: "asc" },
        },
        _count: {
          select: { enrollments: true },
        },
      },
    });

    return successResponse(academicYears, "Academic years retrieved successfully");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = authorize(request, ["ADMIN", "HEAD_TEACHER"]);
    if (auth.response) return auth.response;

    const body = await request.json();
    const validatedData = createAcademicYearSchema.parse(body);

    const existingName = await prisma.academicYear.findUnique({
      where: { name: validatedData.name },
    });
    if (existingName) {
      return errorResponse("Academic year with this name already exists.", 409);
    }

    // If isCurrent is true, unset other current academic years inside a transaction
    const academicYear = await prisma.$transaction(async (tx) => {
      if (validatedData.isCurrent) {
        await tx.academicYear.updateMany({
          data: { isCurrent: false },
        });
      }

      return tx.academicYear.create({
        data: validatedData,
      });
    });

    return successResponse(academicYear, "Academic year created successfully", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
