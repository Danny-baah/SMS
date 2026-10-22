import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { loginUserSchema } from "@/lib/validators";
import { verifyPassword, generateToken } from "@/lib/auth";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { usernameOrEmail, password } = loginUserSchema.parse(body);

    // Find user by either username or email
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: usernameOrEmail },
          { email: usernameOrEmail },
        ],
      },
      include: {
        staff: {
          select: {
            id: true,
            staffNumber: true,
            firstName: true,
            lastName: true,
            jobTitle: true,
          },
        },
      },
    });

    if (!user) {
      return errorResponse("Invalid username or password.", 401);
    }

    if (!user.isActive) {
      return errorResponse("This account has been deactivated. Please contact an administrator.", 403);
    }

    // Verify bcrypt hash
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return errorResponse("Invalid username or password.", 401);
    }

    const token = generateToken({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    });

    const userProfile = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      staffId: user.staffId,
      staff: user.staff,
    };

    return successResponse(
      { token, user: userProfile },
      "Login successful"
    );
  } catch (error) {
    return handleApiError(error);
  }
}
