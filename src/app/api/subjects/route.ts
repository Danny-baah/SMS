import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { createSubjectSchema, subjectQuerySchema } from "@/lib/validators";
import { authorize } from "@/lib/auth";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = subjectQuerySchema.parse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      sortBy: searchParams.get("sortBy") ?? undefined,
      sortOrder: searchParams.get("sortOrder") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    });

    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { subjectName: { contains: query.search } },
        { subjectCode: { contains: query.search } },
      ];
    }

    const skip = (query.page - 1) * query.limit;
    const take = query.limit;

    const [total, subjects] = await Promise.all([
      prisma.subject.count({ where }),
      prisma.subject.findMany({
        where,
        skip,
        take,
        orderBy: query.sortBy ? { [query.sortBy]: query.sortOrder } : { subjectName: "asc" },
        include: {
          classes: {
            include: {
              schoolClass: { select: { id: true, className: true, level: true } },
              teacher: { select: { id: true, firstName: true, lastName: true } },
            },
          },
        },
      }),
    ]);

    return successResponse(subjects, "Subjects retrieved successfully", 200, {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = authorize(request, ["ADMIN", "HEAD_TEACHER"]);
    if (auth.response) return auth.response;

    const body = await request.json();
    const validatedData = createSubjectSchema.parse(body);

    const existingCode = await prisma.subject.findUnique({
      where: { subjectCode: validatedData.subjectCode },
    });
    if (existingCode) {
      return errorResponse("Subject code already exists.", 409);
    }

    const newSubject = await prisma.subject.create({
      data: validatedData,
    });

    return successResponse(newSubject, "Subject created successfully", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
