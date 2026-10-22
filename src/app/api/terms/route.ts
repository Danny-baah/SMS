import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { createTermSchema } from "@/lib/validators";
import { authorize } from "@/lib/auth";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const academicYearId = searchParams.get("academicYearId");

    const where: any = {};
    if (academicYearId) {
      where.academicYearId = parseInt(academicYearId, 10);
    }

    const terms = await prisma.term.findMany({
      where,
      orderBy: { startDate: "asc" },
      include: {
        academicYear: {
          select: { id: true, name: true, isCurrent: true },
        },
      },
    });

    return successResponse(terms, "Terms retrieved successfully");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = authorize(request, ["ADMIN", "HEAD_TEACHER"]);
    if (auth.response) return auth.response;

    const body = await request.json();
    const validatedData = createTermSchema.parse(body);

    // Verify academic year exists
    const academicYear = await prisma.academicYear.findUnique({
      where: { id: validatedData.academicYearId },
    });
    if (!academicYear) {
      return errorResponse("Academic year not found.", 404);
    }

    // Verify term dates are within academic year date range
    if (validatedData.startDate < academicYear.startDate || validatedData.endDate > academicYear.endDate) {
      return errorResponse("Term dates must fall within the academic year dates.", 400);
    }

    // Check unique term name within academic year
    const existing = await prisma.term.findUnique({
      where: {
        unique_term_per_academic_year: {
          academicYearId: validatedData.academicYearId,
          name: validatedData.name,
        },
      },
    });
    if (existing) {
      return errorResponse("A term with this name already exists in this academic year.", 409);
    }

    const term = await prisma.$transaction(async (tx) => {
      if (validatedData.isCurrent) {
        await tx.term.updateMany({
          where: { academicYearId: validatedData.academicYearId },
          data: { isCurrent: false },
        });
      }

      return tx.term.create({
        data: validatedData,
      });
    });

    return successResponse(term, "Term created successfully", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
