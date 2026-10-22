import { z } from "zod";

// -------------------------------------------------------------
// COMMON SCHEMAS
// -------------------------------------------------------------

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  sortBy: z.string().trim().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive("ID must be a positive integer"),
});

// -------------------------------------------------------------
// 1. STUDENT SCHEMAS
// -------------------------------------------------------------

export const studentSexEnum = z.enum(["MALE", "FEMALE", "OTHER"]);
export const studentStatusEnum = z.enum(["ACTIVE", "INACTIVE", "TRANSFERRED", "GRADUATED", "SUSPENDED"]);

export const createStudentSchema = z.object({
  admissionNumber: z.string().min(2).max(50).trim(),
  firstName: z.string().min(1).max(100).trim(),
  lastName: z.string().min(1).max(100).trim(),
  dateOfBirth: z.coerce.date().refine((d) => d < new Date(), {
    message: "Date of birth must be in the past",
  }),
  sex: studentSexEnum,
  address: z.string().min(3).max(255).trim(),
  admissionDate: z.coerce.date(),
  status: studentStatusEnum.default("ACTIVE"),
  classId: z.union([z.coerce.number().int().positive(), z.literal(""), z.null()]).optional(),
});

export const updateStudentSchema = createStudentSchema.partial();

export const studentQuerySchema = paginationQuerySchema.extend({
  status: studentStatusEnum.optional(),
  sex: studentSexEnum.optional(),
  classId: z.coerce.number().int().positive().optional(),
  academicYearId: z.coerce.number().int().positive().optional(),
});

// -------------------------------------------------------------
// 2. GUARDIAN SCHEMAS
// -------------------------------------------------------------

export const createGuardianSchema = z.object({
  fullName: z.string().min(2).max(150).trim(),
  relationship: z.string().min(2).max(50).trim(), // e.g. Father, Mother, Uncle
  phone: z.string().min(7).max(25).trim(),
  email: z.string().email("Invalid email format").max(100).trim().optional().or(z.literal("")),
  address: z.string().min(3).max(255).trim(),
});

export const updateGuardianSchema = createGuardianSchema.partial();

export const guardianQuerySchema = paginationQuerySchema.extend({
  relationship: z.string().optional(),
});

// -------------------------------------------------------------
// 3. STUDENT-GUARDIAN JUNCTION SCHEMAS
// -------------------------------------------------------------

export const createStudentGuardianSchema = z.object({
  studentId: z.coerce.number().int().positive(),
  guardianId: z.coerce.number().int().positive(),
  isPrimary: z.boolean().default(false),
  relationship: z.string().max(50).trim().optional(),
});

export const updateStudentGuardianSchema = z.object({
  isPrimary: z.boolean().optional(),
  relationship: z.string().max(50).trim().optional(),
});

// -------------------------------------------------------------
// 4. STAFF SCHEMAS
// -------------------------------------------------------------

export const employmentStatusEnum = z.enum(["ACTIVE", "ON_LEAVE", "TERMINATED", "RESIGNED"]);

export const createStaffSchema = z.object({
  staffNumber: z.string().min(2).max(50).trim(),
  firstName: z.string().min(1).max(100).trim(),
  lastName: z.string().min(1).max(100).trim(),
  email: z.string().email("Invalid email format").max(100).trim(),
  phone: z.string().min(7).max(25).trim(),
  jobTitle: z.string().min(2).max(100).trim(),
  employmentStatus: employmentStatusEnum.default("ACTIVE"),
  hireDate: z.coerce.date(),
});

export const updateStaffSchema = createStaffSchema.partial();

export const staffQuerySchema = paginationQuerySchema.extend({
  employmentStatus: employmentStatusEnum.optional(),
  jobTitle: z.string().optional(),
});

// -------------------------------------------------------------
// 5. SUBJECT SCHEMAS
// -------------------------------------------------------------

export const subjectStatusEnum = z.enum(["ACTIVE", "INACTIVE"]);

export const createSubjectSchema = z.object({
  subjectCode: z.string().min(2).max(30).trim().toUpperCase(),
  subjectName: z.string().min(2).max(100).trim(),
  description: z.string().trim().optional(),
  status: subjectStatusEnum.default("ACTIVE"),
});

export const updateSubjectSchema = createSubjectSchema.partial();

export const subjectQuerySchema = paginationQuerySchema.extend({
  status: subjectStatusEnum.optional(),
});

// -------------------------------------------------------------
// 6. SCHOOL CLASS SCHEMAS
// -------------------------------------------------------------

export const classLevelEnum = z.enum(["PRESCHOOL", "PRIMARY", "JHS"]);

export const createSchoolClassSchema = z.object({
  className: z.string().min(2).max(50).trim(),
  level: classLevelEnum,
  section: z.string().max(20).trim().optional(),
  capacity: z.coerce.number().int().min(1).max(200).default(40),
  classTeacherId: z.coerce.number().int().positive().nullable().optional(),
});

export const updateSchoolClassSchema = createSchoolClassSchema.partial();

export const schoolClassQuerySchema = paginationQuerySchema.extend({
  level: classLevelEnum.optional(),
  classTeacherId: z.coerce.number().int().positive().optional(),
});

// -------------------------------------------------------------
// 7. ACADEMIC YEAR SCHEMAS
// -------------------------------------------------------------

export const academicYearStatusEnum = z.enum(["UPCOMING", "ACTIVE", "COMPLETED", "ARCHIVED"]);

export const createAcademicYearSchema = z
  .object({
    name: z.string().min(4).max(30).trim(), // e.g. "2025/2026"
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    status: academicYearStatusEnum.default("UPCOMING"),
    isCurrent: z.boolean().default(false),
  })
  .refine((data) => data.startDate < data.endDate, {
    message: "Start date must be before end date",
    path: ["endDate"],
  });

export const updateAcademicYearSchema = z
  .object({
    name: z.string().min(4).max(30).trim().optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    status: academicYearStatusEnum.optional(),
    isCurrent: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.startDate < data.endDate;
      }
      return true;
    },
    {
      message: "Start date must be before end date",
      path: ["endDate"],
    }
  );

// -------------------------------------------------------------
// 8. TERM SCHEMAS
// -------------------------------------------------------------

export const termStatusEnum = z.enum(["UPCOMING", "ACTIVE", "COMPLETED"]);

export const createTermSchema = z
  .object({
    name: z.string().min(2).max(50).trim(), // e.g. "Term 1"
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    academicYearId: z.coerce.number().int().positive(),
    status: termStatusEnum.default("UPCOMING"),
    isCurrent: z.boolean().default(false),
  })
  .refine((data) => data.startDate < data.endDate, {
    message: "Term start date must be before end date",
    path: ["endDate"],
  });

export const updateTermSchema = z
  .object({
    name: z.string().min(2).max(50).trim().optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    academicYearId: z.coerce.number().int().positive().optional(),
    status: termStatusEnum.optional(),
    isCurrent: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.startDate < data.endDate;
      }
      return true;
    },
    {
      message: "Term start date must be before end date",
      path: ["endDate"],
    }
  );

// -------------------------------------------------------------
// 9. ENROLLMENT SCHEMAS
// -------------------------------------------------------------

export const enrollmentStatusEnum = z.enum(["ENROLLED", "TRANSFERRED", "WITHDRAWN", "COMPLETED"]);

export const createEnrollmentSchema = z.object({
  studentId: z.coerce.number().int().positive(),
  schoolClassId: z.coerce.number().int().positive(),
  academicYearId: z.coerce.number().int().positive(),
  enrollmentDate: z.coerce.date().default(() => new Date()),
  status: enrollmentStatusEnum.default("ENROLLED"),
  rollNumber: z.string().max(30).trim().optional(),
});

export const updateEnrollmentSchema = z.object({
  schoolClassId: z.coerce.number().int().positive().optional(),
  status: enrollmentStatusEnum.optional(),
  rollNumber: z.string().max(30).trim().optional(),
});

export const enrollmentQuerySchema = paginationQuerySchema.extend({
  studentId: z.coerce.number().int().positive().optional(),
  schoolClassId: z.coerce.number().int().positive().optional(),
  academicYearId: z.coerce.number().int().positive().optional(),
  status: enrollmentStatusEnum.optional(),
});

// -------------------------------------------------------------
// 10. ATTENDANCE SCHEMAS
// -------------------------------------------------------------

export const attendanceStatusEnum = z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]);

export const markAttendanceRecordSchema = z.object({
  studentId: z.coerce.number().int().positive(),
  schoolClassId: z.coerce.number().int().positive(),
  date: z.coerce.date(),
  status: attendanceStatusEnum.default("PRESENT"),
  remarks: z.string().max(255).trim().optional(),
  recordedById: z.coerce.number().int().positive().optional(),
});

export const bulkAttendanceSchema = z.object({
  schoolClassId: z.coerce.number().int().positive(),
  date: z.coerce.date(),
  recordedById: z.coerce.number().int().positive().optional(),
  records: z.array(
    z.object({
      studentId: z.coerce.number().int().positive(),
      status: attendanceStatusEnum,
      remarks: z.string().max(255).trim().optional(),
    })
  ).min(1, "At least one attendance record is required"),
});

export const updateAttendanceSchema = z.object({
  status: attendanceStatusEnum.optional(),
  remarks: z.string().max(255).trim().optional(),
});

export const attendanceQuerySchema = paginationQuerySchema.extend({
  studentId: z.coerce.number().int().positive().optional(),
  schoolClassId: z.coerce.number().int().positive().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  status: attendanceStatusEnum.optional(),
});

// -------------------------------------------------------------
// 11. USER & AUTH SCHEMAS
// -------------------------------------------------------------

export const userRoleEnum = z.enum(["ADMIN", "HEAD_TEACHER", "TEACHER", "STAFF"]);

export const registerUserSchema = z.object({
  username: z.string().min(3).max(50).trim().regex(/^[a-zA-Z0-9_-]+$/, {
    message: "Username can only contain alphanumeric characters, underscores, and dashes",
  }),
  email: z.string().email("Invalid email format").max(100).trim(),
  password: z.string().min(6, "Password must be at least 6 characters long"),
  role: userRoleEnum.default("STAFF"),
  staffId: z.coerce.number().int().positive().optional(),
});

export const loginUserSchema = z.object({
  usernameOrEmail: z.string().min(1, "Username or email is required").trim(),
  password: z.string().min(1, "Password is required"),
});

// -------------------------------------------------------------
// 12. CLASS-SUBJECT SCHEMAS
// -------------------------------------------------------------

export const assignClassSubjectSchema = z.object({
  schoolClassId: z.coerce.number().int().positive(),
  subjectId: z.coerce.number().int().positive(),
  teacherId: z.coerce.number().int().positive().optional(),
});
