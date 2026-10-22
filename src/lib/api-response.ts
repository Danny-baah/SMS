import { NextResponse } from "next/server";
import { ZodError } from "zod";

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  errors?: Array<{
    field?: string;
    message: string;
  }>;
}

export function successResponse<T>(
  data: T,
  message = "Operation successful",
  status = 200,
  pagination?: { page: number; limit: number; total: number; totalPages: number }
) {
  const body: ApiResponse<T> = {
    success: true,
    message,
    data,
    ...(pagination ? { pagination } : {}),
  };
  return NextResponse.json(body, { status });
}

export function errorResponse(
  message: string,
  status = 400,
  errors?: Array<{ field?: string; message: string }>
) {
  const body: ApiResponse = {
    success: false,
    message,
    ...(errors && errors.length > 0 ? { errors } : { errors: [] }),
  };
  return NextResponse.json(body, { status });
}

export function handleApiError(error: unknown) {
  // Handle Zod Validation Errors
  if (error instanceof ZodError) {
    const formattedErrors = error.issues.map((err) => ({
      field: err.path.join("."),
      message: err.message,
    }));
    return errorResponse("Validation failed", 400, formattedErrors);
  }

  // Handle Prisma / Database Errors safely without leaking internal SQL or credentials
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code: string }).code;
    if (code === "P2002") {
      const meta = (error as { meta?: { target?: string[] | string } }).meta;
      const target = meta?.target ? (Array.isArray(meta.target) ? meta.target.join(", ") : meta.target) : "field";
      return errorResponse(`A record with this ${target} already exists.`, 409, [
        { field: String(target), message: "Unique constraint violation" },
      ]);
    }
    if (code === "P2025") {
      return errorResponse("The requested record was not found.", 404);
    }
    if (code === "P2003") {
      return errorResponse("Foreign key constraint violation: referenced record does not exist or is in use.", 400);
    }
    if (code === "ER_DUP_ENTRY") {
      return errorResponse("Duplicate entry: a record with these unique details already exists.", 409);
    }
    if (code === "ER_ROW_IS_REFERENCED_2" || code === "ER_NO_REFERENCED_ROW_2") {
      return errorResponse("Database relationship constraint violation.", 400);
    }
  }

  // Handle standard errors
  if (error instanceof Error) {
    // Prevent credential leaks
    if (error.message.includes("Access denied") || error.message.includes("ECONNREFUSED")) {
      return errorResponse("Database connection error. Please verify database server status and credentials.", 503);
    }
    return errorResponse(error.message || "An unexpected error occurred.", 500);
  }

  return errorResponse("An unexpected server error occurred.", 500);
}
