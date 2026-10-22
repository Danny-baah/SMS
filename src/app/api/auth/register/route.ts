import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { registerUserSchema } from "@/lib/validators";
import { hashPassword, generateToken, authorize } from "@/lib/auth";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = registerUserSchema.parse(body);

    // If an initial admin does not exist, allow registration.
    // Otherwise require ADMIN or HEAD_TEACHER to register new accounts.
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      const auth = authorize(request, ["ADMIN", "HEAD_TEACHER"]);
      if (auth.response) return auth.response;
    }

    // Check unique username
    const existingUsername = await prisma.user.findUnique({
      where: { username: validatedData.username },
    });
    if (existingUsername) {
      return errorResponse("Username is already taken.", 409, [
        { field: "username", message: "Username already exists" },
      ]);
    }

    // Check unique email
    const existingEmail = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });
    if (existingEmail) {
      return errorResponse("Email is already registered.", 409, [
        { field: "email", message: "Email already exists" },
      ]);
    }

    // Hash password securely
    const passwordHash = await hashPassword(validatedData.password);

    const newUser = await prisma.user.create({
      data: {
        username: validatedData.username,
        email: validatedData.email,
        passwordHash,
        role: validatedData.role,
        staffId: validatedData.staffId || null,
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        staffId: true,
        isActive: true,
        createdAt: true,
      },
    });

    const token = generateToken(newUser);

    return successResponse(
      { user: newUser, token },
      "User registered successfully",
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}
