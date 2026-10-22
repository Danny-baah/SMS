# School Management System (SMS) — Backend

A robust, enterprise-grade REST backend for a basic school covering Preschool, Primary, and Junior High School (JHS), built with **Next.js (App Router)**, **TypeScript**, **MySQL 8.0.46**, **Prisma ORM 7**, and **Zod**.

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Prerequisites](#prerequisites)
4. [Environment Configuration](#environment-configuration)
5. [Database Architecture & Schema](#database-architecture--schema)
6. [Database Migrations & Seeding](#database-migrations--seeding)
7. [API Documentation](#api-documentation)
8. [Authentication & Role-Based Access Control](#authentication--role-based-access-control)
9. [SQL Injection Demonstration & Resolution](#sql-injection-demonstration--resolution)
10. [Database Backup & Restoration](#database-backup--restoration)
11. [Testing & Verification](#testing--verification)
12. [Reproducible Setup Commands (Windows)](#reproducible-setup-commands-windows)

---

## 1. Project Overview

The School Management System backend provides central academic, administrative, and student life services for basic educational institutions. The system manages pupils from early childhood (Nursery, KG) through Primary to Junior High School (JHS 1–3).

### Key Features
- **Student Information Management**: Admission numbers, demographics, enrollment tracking, and status handling.
- **Guardian & Family Linkage**: Junction mapping supporting multiple guardians per pupil with primary contact flags.
- **Academic Hierarchy**: Multi-year academic calendars, term periods, and classes structured by educational levels.
- **Staff & Subject Allocation**: Faculty profiles, subject master registries, and class-subject teacher allocations.
- **Daily Attendance Tracking**: Daily student attendance logging with bulk marking and date/class summary metrics.
- **Reporting & Dashboard Analytics**: Aggregated school summaries, capacity utilization, and attendance rates.
- **Security & Authorization**: Bcrypt password hashing, signed cryptographic tokens, and server-side role enforcement (`ADMIN`, `HEAD_TEACHER`, `TEACHER`, `STAFF`).
- **Security Demonstration Lab**: An isolated environment demonstrating SQL injection vulnerability and its parameterized resolution.
- **Disaster Recovery**: Windows PowerShell scripts for schema and data backup/restoration with verification checklists.

---

## 2. Technology Stack

- **Runtime & Framework**: Node.js v22+ & Next.js 16+ (App Router)
- **Language**: TypeScript 5+ (Strict Type Checking)
- **Database**: MySQL 8.0.46 Community Server
- **ORM & Driver**: Prisma ORM 7 with `@prisma/adapter-mariadb` & `mariadb` connection pool
- **Validation**: Zod (Input sanitization, boundary checks, and route schemas)
- **Cryptography**: `bcryptjs` for password hashing, `node:crypto` HMAC-SHA256 for signed bearer tokens
- **Test Runner**: `tsx` execution runner for unit, integration, and security test suites

---

## 3. Prerequisites

- **Windows 10 / 11** or Windows Server
- **Node.js** (v20+ or v22.14.0 LTS recommended)
- **MySQL 8.0.46** installed and running on port 3306 (`MySQL80` service)
- **PowerShell 5.1+ / 7+**

---

## 4. Environment Configuration

The application reads database and secret configurations exclusively from `.env`. A reference template is provided in `.env.example`.

### Step 1: Create `.env`
Copy `.env.example` to `.env`:
```powershell
Copy-Item .env.example .env
```

### Step 2: Configure Environment Variables
Edit `.env` and provide your MySQL root password:
```env
# Database Connection URL (Standard format)
DATABASE_URL="mysql://root:YOUR_PASSWORD@localhost:3306/school_management"

# Isolated Test Database (For test restoration & isolated runs)
TEST_DATABASE_URL="mysql://root:YOUR_PASSWORD@localhost:3306/school_management_test"

# Application Settings
NODE_ENV="development"
PORT=3000

# Security Secrets
AUTH_SECRET="sms_secure_token_signing_secret_key_change_in_production_32chars"
AUTH_SALT_ROUNDS=10
```

> **Security Note**: `.env` is registered in `.gitignore` and must never be committed to source control.

---

## 5. Database Architecture & Schema

The database schema (`prisma/schema.prisma`) implements all 9 mandatory entities plus supporting models:

```
┌─────────────────┐       ┌────────────────────┐       ┌──────────────────┐
│     Student     │──1:N──│   StudentGuardian  │──N:1──│     Guardian     │
└─────────────────┘       └────────────────────┘       └──────────────────┘
         │                          
        1:N                         
         ▼                          
┌─────────────────┐       ┌────────────────────┐       ┌──────────────────┐
│   Enrollment    │──N:1──│    SchoolClass     │──N:1──│      Staff       │
└─────────────────┘       └────────────────────┘       └──────────────────┘
         │                          │                           │
        N:1                        1:N                         1:1
         ▼                          ▼                           ▼
┌─────────────────┐       ┌────────────────────┐       ┌──────────────────┐
│  AcademicYear   │──1:N──│    ClassSubject    │       │       User       │
└─────────────────┘       └────────────────────┘       └──────────────────┘
         │                          │
        1:N                        N:1
         ▼                          ▼
┌─────────────────┐       ┌────────────────────┐
│      Term       │       │      Subject       │
└─────────────────┘       └────────────────────┘
```

### Required Entity Models:
1. **`Student` (`students`)**: ID, unique `admissionNumber`, name, date of birth, sex, address, admission date, status (`ACTIVE`, `INACTIVE`, `TRANSFERRED`, `GRADUATED`, `SUSPENDED`).
2. **`Guardian` (`guardians`)**: ID, full name, relationship, phone number, optional email, address.
3. **`StudentGuardian` (`student_guardians`)**: Junction model with `studentId`, `guardianId`, `isPrimary`, and unique constraint `@@unique([studentId, guardianId])`.
4. **`Staff` (`staff`)**: ID, unique `staffNumber`, name, unique email, phone, job title, employment status, hire date.
5. **`Subject` (`subjects`)**: ID, unique `subjectCode`, subject name, description, status (`ACTIVE`, `INACTIVE`).
6. **`SchoolClass` (`school_classes`)**: ID, class name, level (`PRESCHOOL`, `PRIMARY`, `JHS`), section, capacity, and `classTeacherId` reference to Staff.
7. **`AcademicYear` (`academic_years`)**: ID, unique `name` (e.g. `2026/2027`), start/end dates, status, `isCurrent` boolean.
8. **`Term` (`terms`)**: ID, name (e.g. `Term 1`), start/end dates, `academicYearId`, status, `isCurrent`, unique `@@unique([academicYearId, name])`.
9. **`Enrollment` (`enrollments`)**: ID, `studentId`, `schoolClassId`, `academicYearId`, enrollment date, status (`ENROLLED`, `TRANSFERRED`, `WITHDRAWN`, `COMPLETED`), roll number, unique `@@unique([studentId, schoolClassId, academicYearId])`.

### Supporting Models:
10. **`Attendance` (`attendances`)**: Daily attendance logs with `studentId`, `schoolClassId`, `date`, `status` (`PRESENT`, `ABSENT`, `LATE`, `EXCUSED`), remarks, `recordedById`, unique `@@unique([studentId, date])`.
11. **`User` (`users`)**: Application authentication accounts with `username`, `email`, bcrypt `passwordHash`, role (`ADMIN`, `HEAD_TEACHER`, `TEACHER`, `STAFF`), and optional 1:1 relation to `Staff`.
12. **`ClassSubject` (`class_subjects`)**: Junction model linking subjects to classes and assigned subject teachers.

---

## 6. Database Migrations & Seeding

### 1. Generating Prisma Client
```powershell
npm run prisma:generate
```

### 2. Running Migrations
To create and apply migrations on your local MySQL server:
```powershell
npm run prisma:migrate
```
Or to synchronize the schema directly to the database:
```powershell
npm run prisma:push
```

### 3. Seeding the Database
The idempotent seed script (`prisma/seed.ts`) populates the database with realistic fictional records (Ghana basic education context):
```powershell
npm run seed
```

**Seed Data Injected:**
- **Academic Years**: `2025/2026` (Completed) and `2026/2027` (Current Active).
- **Terms**: Terms 1, 2, and 3 with non-overlapping validated date ranges.
- **Staff Profiles**: Head Teacher, Senior Primary Teacher, JHS Science & ICT Teacher, Preschool Educator.
- **Default Accounts**:
  - `admin` (Password: `Admin@123`, Role: `ADMIN`)
  - `headteacher` (Password: `Admin@123`, Role: `HEAD_TEACHER`)
  - `teacher_grace` (Password: `Teacher@123`, Role: `TEACHER`)
- **Classes**: Nursery 1, KG 1, Primary 1, Primary 6, JHS 1.
- **Curriculum Subjects**: English Language, Mathematics, Integrated Science, Social Studies, ICT, Ghanaian Language.
- **Students & Guardians**: Fictional pupils (`STU-2026-001` through `005`) linked to guardians and enrolled in classes.
- **Attendance**: Daily attendance records marked for pupils.

> **Idempotency Guarantee**: The seed script uses Prisma `upsert` on unique constraints; it can be re-run indefinitely without duplicate key errors or ghost rows.

---

## 7. API Documentation

All API responses follow a uniform JSON structure.

### Standard Response Envelope:
```json
// Success Response
{
  "success": true,
  "message": "Operation successful",
  "data": { ... },
  "pagination": { "page": 1, "limit": 10, "total": 45, "totalPages": 5 }
}

// Error Response
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "admissionNumber", "message": "Admission number must be unique" }
  ]
}
```

### API Endpoints Summary

| Method | Endpoint | Description | Auth Roles |
| :--- | :--- | :--- | :--- |
| **POST** | `/api/auth/register` | Register new user account | ADMIN, HEAD_TEACHER (or initial bootstrap) |
| **POST** | `/api/auth/login` | Authenticate and obtain JWT Bearer token | Public |
| **GET** | `/api/auth/me` | Fetch authenticated user profile | Any authenticated user |
| **GET** | `/api/students` | List students (filters: class, year, sex, status, search, pagination) | Public / Read |
| **POST** | `/api/students` | Create student record | ADMIN, HEAD_TEACHER, STAFF |
| **GET** | `/api/students/:id` | Get student details with guardians and enrollments | Public / Read |
| **PATCH** | `/api/students/:id` | Update student profile | ADMIN, HEAD_TEACHER, STAFF |
| **DELETE** | `/api/students/:id` | Delete student record | ADMIN, HEAD_TEACHER |
| **GET** | `/api/guardians` | List guardians with student linkages | Public / Read |
| **POST** | `/api/guardians` | Create new guardian | ADMIN, HEAD_TEACHER, STAFF |
| **GET** | `/api/guardians/:id` | Get guardian details and linked students | Public / Read |
| **PATCH** | `/api/guardians/:id` | Update guardian details | ADMIN, HEAD_TEACHER, STAFF |
| **DELETE** | `/api/guardians/:id` | Delete guardian | ADMIN, HEAD_TEACHER |
| **GET** | `/api/student-guardians` | List student-guardian relationships | Public / Read |
| **POST** | `/api/student-guardians` | Link student to guardian (with primary flag) | ADMIN, HEAD_TEACHER, STAFF |
| **PATCH** | `/api/student-guardians/:id` | Update link (primary contact, notes) | ADMIN, HEAD_TEACHER, STAFF |
| **DELETE** | `/api/student-guardians/:id` | Remove student-guardian link | ADMIN, HEAD_TEACHER |
| **GET** | `/api/staff` | List staff members | Public / Read |
| **POST** | `/api/staff` | Create new staff profile | ADMIN, HEAD_TEACHER |
| **GET** | `/api/staff/:id` | Get staff profile with assigned classes/subjects | Public / Read |
| **PATCH** | `/api/staff/:id` | Update staff profile | ADMIN, HEAD_TEACHER |
| **DELETE** | `/api/staff/:id` | Delete staff member | ADMIN, HEAD_TEACHER |
| **GET** | `/api/subjects` | List academic subjects | Public / Read |
| **POST** | `/api/subjects` | Create new subject | ADMIN, HEAD_TEACHER |
| **GET** | `/api/subjects/:id` | Get subject details | Public / Read |
| **PATCH** | `/api/subjects/:id` | Update subject | ADMIN, HEAD_TEACHER |
| **DELETE** | `/api/subjects/:id` | Delete subject | ADMIN, HEAD_TEACHER |
| **GET** | `/api/classes` | List school classes with capacity and counts | Public / Read |
| **POST** | `/api/classes` | Create new school class | ADMIN, HEAD_TEACHER |
| **GET** | `/api/classes/:id` | Get class details with enrolled students | Public / Read |
| **PATCH** | `/api/classes/:id` | Update class details or assigned teacher | ADMIN, HEAD_TEACHER |
| **DELETE** | `/api/classes/:id` | Delete class (requires no active enrollments) | ADMIN, HEAD_TEACHER |
| **GET** | `/api/academic-years` | List academic years with terms and enrollment totals | Public / Read |
| **POST** | `/api/academic-years` | Create academic year | ADMIN, HEAD_TEACHER |
| **GET** | `/api/academic-years/:id` | Get academic year details | Public / Read |
| **PATCH** | `/api/academic-years/:id` | Update academic year | ADMIN, HEAD_TEACHER |
| **DELETE** | `/api/academic-years/:id` | Delete academic year | ADMIN, HEAD_TEACHER |
| **GET** | `/api/terms` | List terms (filter by academicYearId) | Public / Read |
| **POST** | `/api/terms` | Create term (validated within academic year date range) | ADMIN, HEAD_TEACHER |
| **GET** | `/api/terms/:id` | Get term details | Public / Read |
| **PATCH** | `/api/terms/:id` | Update term | ADMIN, HEAD_TEACHER |
| **DELETE** | `/api/terms/:id` | Delete term | ADMIN, HEAD_TEACHER |
| **GET** | `/api/enrollments` | List enrollments (filter by student, class, year, status) | Public / Read |
| **POST** | `/api/enrollments` | Enroll student in class (capacity & duplicate checked) | ADMIN, HEAD_TEACHER, STAFF |
| **PATCH** | `/api/enrollments/:id` | Transfer student to new class or update status | ADMIN, HEAD_TEACHER, STAFF |
| **DELETE** | `/api/enrollments/:id` | Soft-withdraw enrollment (preserves historical record) | ADMIN, HEAD_TEACHER |
| **GET** | `/api/attendance` | Query attendance (filter by date range, student, class) | Public / Read |
| **POST** | `/api/attendance` | Record single attendance or bulk class attendance | ADMIN, HEAD_TEACHER, TEACHER, STAFF |
| **GET** | `/api/attendance/:id` | Get attendance record | Public / Read |
| **PATCH** | `/api/attendance/:id` | Update attendance status/remarks | ADMIN, HEAD_TEACHER, TEACHER, STAFF |
| **DELETE** | `/api/attendance/:id` | Delete attendance record | ADMIN, HEAD_TEACHER |
| **GET** | `/api/class-subjects` | List subject-to-class assignments | Public / Read |
| **POST** | `/api/class-subjects` | Assign subject to class with teacher | ADMIN, HEAD_TEACHER |
| **DELETE** | `/api/class-subjects` | Unassign subject from class | ADMIN, HEAD_TEACHER |
| **GET** | `/api/dashboard/summary` | Reporting endpoint (totals, class occupancy, attendance rate) | Public / Read |

---

## 8. Authentication & Role-Based Access Control

The backend implements cryptographic authentication with server-side authorization:
- **Hashing**: Passwords hashed with `bcryptjs` using 10 salt rounds. Plaintext passwords are never logged or stored.
- **Session Tokens**: Signed HMAC-SHA256 tokens carrying user identifier, role, and expiration timestamp.
- **Protected Operations**: Enforced at the Route Handler layer via `authorize(request, [allowedRoles])`.
- **Authorization Header**:
  ```http
  Authorization: Bearer <TOKEN>
  ```

---

## 9. SQL Injection Demonstration & Resolution

The assignment requires demonstrating an SQL injection attack and its resolution. To guarantee safety and data integrity:
- **Zero Production Vulnerabilities**: Normal application endpoints use parameterized Prisma queries and Zod boundary checks.
- **Isolated Security Lab**: An isolated security module (`src/lib/security-lab/sql-injection-lab.ts`) creates a temporary synthetic table (`_security_lab_synthetic_users`) with dummy test data.
- **Demonstration**:
  1. **Unsafe Query (`unsafeSearch`)**: Uses string concatenation (`... WHERE username = '${input}'`). Entering `' OR '1'='1` alters the boolean logic and leaks all rows.
  2. **Safe Query (`safeParameterizedSearch`)**: Uses bound parameter placeholders (`?`). The database query planner compiles the query structure first; malicious input is treated strictly as literal data, returning 0 rows.
  3. **Cleanup**: The synthetic table is immediately dropped after execution.

To run the automated security demonstration:
```powershell
npm run test:security
```
See detailed documentation in [database/SECURITY_LAB_SQL_INJECTION.md](file:///c:/Users/DELL/OneDrive/Desktop/SMS/database/SECURITY_LAB_SQL_INJECTION.md).

---

## 10. Database Backup & Restoration

Windows-compatible PowerShell scripts with masked password entry are located in `database/`:

### Creating a Backup
```powershell
.\database\backup.ps1
```
Creates `database\backups\backup_school_management_YYYYMMDD_HHMMSS.sql`.

### Safe Restoration to Isolated Test Database
```powershell
.\database\restore.ps1 -BackupFilePath ".\database\backups\backup_school_management_xxxx.sql" -TargetDatabase "school_management_test"
```

### Full Procedures & Least-Privileged User Setup
See [database/BACKUP_AND_RESTORE.md](file:///c:/Users/DELL/OneDrive/Desktop/SMS/database/BACKUP_AND_RESTORE.md).

---

## 11. Testing & Verification

Run the comprehensive test suite verifying:
- Zod schema boundary validation (date ranges, past dates of birth, enums, email formats).
- Password cryptography and token tampering rejection.
- Database connection diagnostics.

```powershell
npm test
```

### Verification Results:
- **Unit & Auth Tests**: 15/15 Passed.
- **TypeScript Typecheck (`tsc --noEmit`)**: 0 Errors.
- **Production Build (`next build`)**: 25 Dynamic Route Handlers compiled successfully.

---

## 12. Reproducible Setup Commands (Windows)

To reproduce the complete backend on a new Windows workstation:

```powershell
# 1. Clone or navigate to project directory
cd C:\Users\DELL\OneDrive\Desktop\SMS

# 2. Install dependencies
npm install

# 3. Create .env file and set your MySQL password
Copy-Item .env.example .env
# Edit .env and set: DATABASE_URL="mysql://root:YOUR_PASSWORD@localhost:3306/school_management"

# 4. Generate Prisma Client
npm run prisma:generate

# 5. Apply migrations / sync schema to MySQL
npm run prisma:push

# 6. Seed fictional test records
npm run seed

# 7. Run backend test suite
npm test

# 8. Run security injection tests
npm run test:security

# 9. Start development server
npm run dev
# The API is available at http://localhost:3000/api
```
