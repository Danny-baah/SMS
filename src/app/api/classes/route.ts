import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { createSchoolClassSchema, schoolClassQuerySchema } from "@/lib/validators";
import { authorize } from "@/lib/auth";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = schoolClassQuerySchema.parse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      sortBy: searchParams.get("sortBy") ?? undefined,
      sortOrder: searchParams.get("sortOrder") ?? undefined,
      level: searchParams.get("level") ?? undefined,
      classTeacherId: searchParams.get("classTeacherId") ?? undefined,
    });

    const where: any = {};
    if (query.level) where.level = query.level;
    if (query.classTeacherId) where.classTeacherId = query.classTeacherId;
    if (query.search) {
      where.OR = [
        { className: { contains: query.search } },
        { section: { contains: query.search } },
      ];
    }

    const skip = (query.page - 1) * query.limit;
    const take = query.limit;

    const [total, classes] = await Promise.all([
      prisma.schoolClass.count({ where }),
      prisma.schoolClass.findMany({
        where,
        skip,
        take,
        orderBy: query.sortBy ? { [query.sortBy]: query.sortOrder } : { className: "asc" },
        include: {
          classTeacher: {
            select: { id: true, firstName: true, lastName: true, staffNumber: true, email: true },
          },
          _count: {
            select: { enrollments: true, subjects: true },
          },
        },
      }),
    ]);

    return successResponse(classes, "School classes retrieved successfully", 200, {
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
    const validatedData = createSchoolClassSchema.parse(body);

    // Check unique class name and section
    const existing = await prisma.schoolClass.findFirst({
      where: {
        className: validatedData.className,
        section: validatedData.section ?? null,
      },
    });
    if (existing) {
      return errorResponse("A class with this name and section already exists.", 409);
    }

    // Verify teacher if specified
    if (validatedData.classTeacherId) {
      const teacher = await prisma.staff.findUnique({
        where: { id: validatedData.classTeacherId },
      });
      if (!teacher) {
        return errorResponse("Assigned class teacher not found.", 404);
      }
    }

    const newClass = await prisma.schoolClass.create({
      data: validatedData,
      include: {
        classTeacher: true,
      },
    });

    return successResponse(newClass, "Class created successfully", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
