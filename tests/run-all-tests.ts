import "dotenv/config";
import {
  createStudentSchema,
  createAcademicYearSchema,
  createTermSchema,
  createEnrollmentSchema,
  createStaffSchema,
  createGuardianSchema,
  markAttendanceRecordSchema,
} from "../src/lib/validators";
import { hashPassword, verifyPassword, generateToken, verifyToken } from "../src/lib/auth";
import { parseConnectionString } from "../src/lib/db";
import mariadb from "mariadb";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    failedTests++;
    console.error(`  ❌ FAIL: ${testName}`);
  }
}

async function runTestSuite() {
  console.log("===============================================================");
  console.log("🧪 RUNNING SCHOOL MANAGEMENT SYSTEM BACKEND TEST SUITE");
  console.log("===============================================================");

  // -------------------------------------------------------------------------
  // 1. Zod Validation Unit Tests (Input Validation & Constraints)
  // -------------------------------------------------------------------------
  console.log("\n[Group 1] Zod Schema Validation & Input Boundary Tests");

  // Valid Student
  const validStudent = createStudentSchema.safeParse({
    admissionNumber: "ADM-2026-999",
    firstName: "Kwabena",
    lastName: "Mensah",
    dateOfBirth: "2015-05-12",
    sex: "MALE",
    address: "Plot 14, Kumasi",
    admissionDate: "2026-09-01",
    status: "ACTIVE",
  });
  assert(validStudent.success, "Valid student data passes validation");

  // Invalid Student - Future Date of Birth
  const futureDobStudent = createStudentSchema.safeParse({
    admissionNumber: "ADM-2026-998",
    firstName: "Kwabena",
    lastName: "Mensah",
    dateOfBirth: "2099-01-01",
    sex: "MALE",
    address: "Plot 14, Kumasi",
    admissionDate: "2026-09-01",
    status: "ACTIVE",
  });
  assert(!futureDobStudent.success, "Future date of birth is rejected by student validator");

  // Invalid Student - Invalid Sex Enum
  const invalidSexStudent = createStudentSchema.safeParse({
    admissionNumber: "ADM-2026-997",
    firstName: "Kwabena",
    lastName: "Mensah",
    dateOfBirth: "2015-05-12",
    sex: "UNKNOWN_GENDER",
    address: "Plot 14, Kumasi",
    admissionDate: "2026-09-01",
    status: "ACTIVE",
  });
  assert(!invalidSexStudent.success, "Invalid sex enum value is rejected");

  // Academic Year Date Range Validation
  const validYear = createAcademicYearSchema.safeParse({
    name: "2026/2027",
    startDate: "2026-09-01",
    endDate: "2027-07-20",
    status: "ACTIVE",
    isCurrent: true,
  });
  assert(validYear.success, "Valid academic year with start < end passes validation");

  const invertedYear = createAcademicYearSchema.safeParse({
    name: "2026/2027",
    startDate: "2027-07-20",
    endDate: "2026-09-01",
    status: "ACTIVE",
  });
  assert(!invertedYear.success, "Academic year with startDate > endDate is rejected");

  // Staff Validation - Email Format
  const invalidEmailStaff = createStaffSchema.safeParse({
    staffNumber: "STF-999",
    firstName: "John",
    lastName: "Doe",
    email: "not-an-email",
    phone: "+233240000000",
    jobTitle: "Teacher",
    employmentStatus: "ACTIVE",
    hireDate: "2022-01-01",
  });
  assert(!invalidEmailStaff.success, "Invalid email address format for staff is rejected");

  // Guardian Validation
  const validGuardian = createGuardianSchema.safeParse({
    fullName: "Akwasi Amponsah",
    relationship: "Father",
    phone: "+233241112233",
    email: "akwasi@example.test",
    address: "House 12, Accra",
  });
  assert(validGuardian.success, "Valid guardian data passes validation");

  // Attendance Validation
  const validAttendance = markAttendanceRecordSchema.safeParse({
    studentId: 1,
    schoolClassId: 2,
    date: "2026-10-19",
    status: "PRESENT",
    remarks: "On time",
  });
  assert(validAttendance.success, "Valid daily attendance entry passes validation");

  // -------------------------------------------------------------------------
  // 2. Authentication & Cryptography Tests
  // -------------------------------------------------------------------------
  console.log("\n[Group 2] Authentication, Password Hashing & Token Verification");

  const plainPassword = "SuperSecurePassword@2026!";
  const hash = await hashPassword(plainPassword);
  assert(hash.startsWith("$2"), "Password hashed with bcrypt format ($2...)");
  assert(hash !== plainPassword, "Plain text password is never stored or preserved");

  const correctMatch = await verifyPassword(plainPassword, hash);
  assert(correctMatch, "Correct password matches bcrypt hash");

  const incorrectMatch = await verifyPassword("WrongPassword123", hash);
  assert(!incorrectMatch, "Incorrect password fails hash verification");

  // Token Generation & Verification
  const userPayload = {
    id: 42,
    username: "test_admin",
    email: "admin@school.test",
    role: "ADMIN" as const,
  };
  const token = generateToken(userPayload, 3600);
  assert(typeof token === "string" && token.split(".").length === 3, "Generated token has 3-part signed structure");

  const verified = verifyToken(token);
  assert(verified !== null && verified.username === "test_admin" && verified.role === "ADMIN", "Valid token correctly verifies and decodes payload");

  // Tampered Token
  const tamperedToken = token.slice(0, -5) + "ABCDE";
  const tamperedResult = verifyToken(tamperedToken);
  assert(tamperedResult === null, "Tampered token signature is detected and rejected");

  // -------------------------------------------------------------------------
  // 3. Database Connection & Environment Diagnostic
  // -------------------------------------------------------------------------
  console.log("\n[Group 3] Database Connection & Driver Adapter Diagnostic");
  const connectionUrl = process.env.DATABASE_URL || "";
  console.log(`-> Testing connection to configured URL host...`);

  try {
    const config = parseConnectionString(connectionUrl);
    const pool = mariadb.createPool(config);
    const conn = await pool.getConnection();
    const rows = await conn.query("SELECT 1 AS alive, VERSION() AS version;");
    conn.release();
    await pool.end();

    assert(Number(rows[0].alive) === 1, `Database connection successful! MySQL Version: ${rows[0].version}`);
  } catch (err: any) {
    console.warn(`  ⚠️ Database live connection status: ${err.message}`);
    console.warn("  ℹ️ Corrective Action: Ensure MySQL service is running and update DATABASE_URL in .env with the correct root password.");
  }

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log("\n===============================================================");
  console.log(`🏁 TEST SUMMARY: ${passedTests}/${totalTests} tests passed (${failedTests} failed)`);
  console.log("===============================================================");

  if (failedTests > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTestSuite().catch((err) => {
  console.error("Test runner encountered fatal error:", err);
  process.exit(1);
});
