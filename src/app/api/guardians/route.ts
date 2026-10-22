import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { createGuardianSchema, guardianQuerySchema } from "@/lib/validators";
import { authorize } from "@/lib/auth";
import { successResponse, handleApiError } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = guardianQuerySchema.parse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      sortBy: searchParams.get("sortBy") ?? undefined,
      sortOrder: searchParams.get("sortOrder") ?? undefined,
      relationship: searchParams.get("relationship") ?? undefined,
    });

    const where: any = {};
    if (query.relationship) {
      where.relationship = { contains: query.relationship };
    }
    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search } },
        { phone: { contains: query.search } },
        { email: { contains: query.search } },
      ];
    }

    const skip = (query.page - 1) * query.limit;
    const take = query.limit;

    const [total, guardians] = await Promise.all([
      prisma.guardian.count({ where }),
      prisma.guardian.findMany({
        where,
        skip,
        take,
        orderBy: query.sortBy ? { [query.sortBy]: query.sortOrder } : { fullName: "asc" },
        include: {
          students: {
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
            },
          },
        },
      }),
    ]);

    return successResponse(guardians, "Guardians retrieved successfully", 200, {
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
    const auth = authorize(request, ["ADMIN", "HEAD_TEACHER", "STAFF"]);
    if (auth.response) return auth.response;

    const body = await request.json();
    const validatedData = createGuardianSchema.parse(body);

    const newGuardian = await prisma.guardian.create({
      data: {
        ...validatedData,
        email: validatedData.email || null,
      },
    });

    return successResponse(newGuardian, "Guardian created successfully", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
