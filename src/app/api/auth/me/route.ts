import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { authorize } from "@/lib/auth";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const auth = authorize(request);
    if (auth.response) return auth.response;

    const user = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        staff: {
          select: {
            id: true,
            staffNumber: true,
            firstName: true,
            lastName: true,
            jobTitle: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!user) {
      return errorResponse("User not found.", 404);
    }

    return successResponse(user, "User profile retrieved successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
