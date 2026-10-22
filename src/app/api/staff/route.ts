import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { createStaffSchema, staffQuerySchema } from "@/lib/validators";
import { authorize } from "@/lib/auth";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = staffQuerySchema.parse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      sortBy: searchParams.get("sortBy") ?? undefined,
      sortOrder: searchParams.get("sortOrder") ?? undefined,
      employmentStatus: searchParams.get("employmentStatus") ?? undefined,
      jobTitle: searchParams.get("jobTitle") ?? undefined,
    });

    const where: any = {};
    if (query.employmentStatus) {
      where.employmentStatus = query.employmentStatus;
    }
    if (query.jobTitle) {
      where.jobTitle = { contains: query.jobTitle };
    }
    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search } },
        { lastName: { contains: query.search } },
        { staffNumber: { contains: query.search } },
        { email: { contains: query.search } },
      ];
    }

    const skip = (query.page - 1) * query.limit;
    const take = query.limit;

    const [total, staff] = await Promise.all([
      prisma.staff.count({ where }),
      prisma.staff.findMany({
        where,
        skip,
        take,
        orderBy: query.sortBy ? { [query.sortBy]: query.sortOrder } : { lastName: "asc" },
        include: {
          classesAsTeacher: {
            select: { id: true, className: true, level: true, section: true },
          },
        },
      }),
    ]);

    return successResponse(staff, "Staff members retrieved successfully", 200, {
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
    const validatedData = createStaffSchema.parse(body);

    const existingStaffNumber = await prisma.staff.findUnique({
      where: { staffNumber: validatedData.staffNumber },
    });
    if (existingStaffNumber) {
      return errorResponse("Staff number is already in use.", 409);
    }

    const existingEmail = await prisma.staff.findUnique({
      where: { email: validatedData.email },
    });
    if (existingEmail) {
      return errorResponse("Staff email address is already in use.", 409);
    }

    const newStaff = await prisma.staff.create({
      data: validatedData,
    });

    return successResponse(newStaff, "Staff member created successfully", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
