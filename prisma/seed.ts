import "dotenv/config";
import { getDbClient } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth";

const { prisma, pool } = getDbClient();

async function main() {
  console.log("🌱 Starting database seeding with fictional test data...");

  // 1. Seed Academic Years (Idempotent upsert)
  console.log("-> Seeding Academic Years...");
  const pastYear = await prisma.academicYear.upsert({
    where: { name: "2025/2026" },
    update: {},
    create: {
      name: "2025/2026",
      startDate: new Date("2025-09-01"),
      endDate: new Date("2026-07-20"),
      status: "COMPLETED",
      isCurrent: false,
    },
  });

  const currentYear = await prisma.academicYear.upsert({
    where: { name: "2026/2027" },
    update: { isCurrent: true, status: "ACTIVE" },
    create: {
      name: "2026/2027",
      startDate: new Date("2026-09-01"),
      endDate: new Date("2027-07-25"),
      status: "ACTIVE",
      isCurrent: true,
    },
  });

  // 2. Seed Terms
  console.log("-> Seeding Terms...");
  const term1 = await prisma.term.upsert({
    where: {
      unique_term_per_academic_year: {
        academicYearId: currentYear.id,
        name: "Term 1",
      },
    },
    update: {},
    create: {
      academicYearId: currentYear.id,
      name: "Term 1",
      startDate: new Date("2026-09-01"),
      endDate: new Date("2026-12-18"),
      status: "ACTIVE",
      isCurrent: true,
    },
  });

  await prisma.term.upsert({
    where: {
      unique_term_per_academic_year: {
        academicYearId: currentYear.id,
        name: "Term 2",
      },
    },
    update: {},
    create: {
      academicYearId: currentYear.id,
      name: "Term 2",
      startDate: new Date("2027-01-10"),
      endDate: new Date("2027-04-15"),
      status: "UPCOMING",
      isCurrent: false,
    },
  });

  await prisma.term.upsert({
    where: {
      unique_term_per_academic_year: {
        academicYearId: currentYear.id,
        name: "Term 3",
      },
    },
    update: {},
    create: {
      academicYearId: currentYear.id,
      name: "Term 3",
      startDate: new Date("2027-05-04"),
      endDate: new Date("2027-07-25"),
      status: "UPCOMING",
      isCurrent: false,
    },
  });

  // 3. Seed Staff Members
  console.log("-> Seeding Staff...");
  const headTeacher = await prisma.staff.upsert({
    where: { staffNumber: "STF-2020-001" },
    update: {},
    create: {
      staffNumber: "STF-2020-001",
      firstName: "Samuel",
      lastName: "Appiah",
      email: "headteacher@school.edu.gh",
      phone: "+233244111222",
      jobTitle: "Head Teacher",
      employmentStatus: "ACTIVE",
      hireDate: new Date("2020-01-15"),
    },
  });

  const teacher1 = await prisma.staff.upsert({
    where: { staffNumber: "STF-2021-002" },
    update: {},
    create: {
      staffNumber: "STF-2021-002",
      firstName: "Grace",
      lastName: "Mensah",
      email: "grace.mensah@school.edu.gh",
      phone: "+233244222333",
      jobTitle: "Senior Teacher (Primary)",
      employmentStatus: "ACTIVE",
      hireDate: new Date("2021-03-01"),
    },
  });

  const teacher2 = await prisma.staff.upsert({
    where: { staffNumber: "STF-2022-003" },
    update: {},
    create: {
      staffNumber: "STF-2022-003",
      firstName: "Emmanuel",
      lastName: "Boakye",
      email: "emmanuel.boakye@school.edu.gh",
      phone: "+233244333444",
      jobTitle: "Science & ICT Teacher (JHS)",
      employmentStatus: "ACTIVE",
      hireDate: new Date("2022-09-01"),
    },
  });

  const teacher3 = await prisma.staff.upsert({
    where: { staffNumber: "STF-2023-004" },
    update: {},
    create: {
      staffNumber: "STF-2023-004",
      firstName: "Doris",
      lastName: "Acheampong",
      email: "doris.acheampong@school.edu.gh",
      phone: "+233244444555",
      jobTitle: "Preschool Educator",
      employmentStatus: "ACTIVE",
      hireDate: new Date("2023-01-10"),
    },
  });

  // 4. Seed Users for Auth
  console.log("-> Seeding Users...");
  const adminPasswordHash = await hashPassword("Admin@123");
  const teacherPasswordHash = await hashPassword("Teacher@123");

  await prisma.user.upsert({
    where: { username: "admin" },
    update: { passwordHash: adminPasswordHash },
    create: {
      username: "admin",
      email: "admin@school.edu.gh",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { username: "headteacher" },
    update: { passwordHash: adminPasswordHash },
    create: {
      username: "headteacher",
      email: "headteacher@school.edu.gh",
      passwordHash: adminPasswordHash,
      role: "HEAD_TEACHER",
      staffId: headTeacher.id,
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { username: "teacher_grace" },
    update: { passwordHash: teacherPasswordHash },
    create: {
      username: "teacher_grace",
      email: "grace.mensah@school.edu.gh",
      passwordHash: teacherPasswordHash,
      role: "TEACHER",
      staffId: teacher1.id,
      isActive: true,
    },
  });

  // 5. Seed School Classes (Preschool through JHS)
  console.log("-> Seeding School Classes...");
  const nurseryClass = await prisma.schoolClass.upsert({
    where: {
      unique_class_section: {
        className: "Nursery 1",
        section: "A",
      },
    },
    update: {},
    create: {
      className: "Nursery 1",
      level: "PRESCHOOL",
      section: "A",
      capacity: 25,
      classTeacherId: teacher3.id,
    },
  });

  const kgClass = await prisma.schoolClass.upsert({
    where: {
      unique_class_section: {
        className: "KG 1",
        section: "A",
      },
    },
    update: {},
    create: {
      className: "KG 1",
      level: "PRESCHOOL",
      section: "A",
      capacity: 30,
      classTeacherId: teacher3.id,
    },
  });

  const primary1Class = await prisma.schoolClass.upsert({
    where: {
      unique_class_section: {
        className: "Primary 1",
        section: "A",
      },
    },
    update: {},
    create: {
      className: "Primary 1",
      level: "PRIMARY",
      section: "A",
      capacity: 35,
      classTeacherId: teacher1.id,
    },
  });

  const primary6Class = await prisma.schoolClass.upsert({
    where: {
      unique_class_section: {
        className: "Primary 6",
        section: "A",
      },
    },
    update: {},
    create: {
      className: "Primary 6",
      level: "PRIMARY",
      section: "A",
      capacity: 40,
      classTeacherId: teacher1.id,
    },
  });

  const jhs1Class = await prisma.schoolClass.upsert({
    where: {
      unique_class_section: {
        className: "JHS 1",
        section: "A",
      },
    },
    update: {},
    create: {
      className: "JHS 1",
      level: "JHS",
      section: "A",
      capacity: 40,
      classTeacherId: teacher2.id,
    },
  });

  // 6. Seed Subjects
  console.log("-> Seeding Subjects...");
  const subjectsData = [
    { code: "ENG-01", name: "English Language", desc: "Core literacy and communication skills" },
    { code: "MATH-01", name: "Mathematics", desc: "Core numeracy, algebra and geometry" },
    { code: "SCI-01", name: "Integrated Science", desc: "General science, nature and technology" },
    { code: "SOC-01", name: "Social Studies", desc: "Environment, culture and civics" },
    { code: "ICT-01", name: "Information & Communication Technology", desc: "Digital literacy and computer studies" },
    { code: "GHL-01", name: "Ghanaian Language (Twi)", desc: "Local language and Ghanaian cultural heritage" },
  ];

  const subjects = [];
  for (const s of subjectsData) {
    const sub = await prisma.subject.upsert({
      where: { subjectCode: s.code },
      update: {},
      create: {
        subjectCode: s.code,
        subjectName: s.name,
        description: s.desc,
        status: "ACTIVE",
      },
    });
    subjects.push(sub);
  }

  // 7. Seed Class-Subject Assignments
  console.log("-> Seeding Subject Assignments...");
  for (const sub of subjects) {
    await prisma.classSubject.upsert({
      where: {
        unique_class_subject: {
          schoolClassId: primary1Class.id,
          subjectId: sub.id,
        },
      },
      update: {},
      create: {
        schoolClassId: primary1Class.id,
        subjectId: sub.id,
        teacherId: teacher1.id,
      },
    });

    await prisma.classSubject.upsert({
      where: {
        unique_class_subject: {
          schoolClassId: jhs1Class.id,
          subjectId: sub.id,
        },
      },
      update: {},
      create: {
        schoolClassId: jhs1Class.id,
        subjectId: sub.id,
        teacherId: teacher2.id,
      },
    });
  }

  // 8. Seed Guardians (Fictional)
  console.log("-> Seeding Guardians...");
  const guardianA = await prisma.guardian.upsert({
    where: { id: 1 },
    update: {},
    create: {
      fullName: "Mr. Kwabena Darko",
      relationship: "Father",
      phone: "+233501234567",
      email: "kdarko@example.test",
      address: "14 Palm Street, Block C, Accra",
    },
  });

  const guardianB = await prisma.guardian.upsert({
    where: { id: 2 },
    update: {},
    create: {
      fullName: "Mrs. Akosua Ansah",
      relationship: "Mother",
      phone: "+233509876543",
      email: "aansah@example.test",
      address: "22 Sunset Boulevard, Kumasi",
    },
  });

  const guardianC = await prisma.guardian.upsert({
    where: { id: 3 },
    update: {},
    create: {
      fullName: "Nana Kofi Sarpong",
      relationship: "Uncle / Legal Guardian",
      phone: "+233505556677",
      email: "nsarpong@example.test",
      address: "8 Heritage Lane, Sunyani",
    },
  });

  // 9. Seed Students (Fictional)
  console.log("-> Seeding Students...");
  const studentsData = [
    { adm: "STU-2026-001", first: "Kofi", last: "Darko", dob: "2018-04-12", sex: "MALE" as const, class: primary1Class, guardian: guardianA },
    { adm: "STU-2026-002", first: "Ama", last: "Darko", dob: "2020-08-23", sex: "FEMALE" as const, class: nurseryClass, guardian: guardianA },
    { adm: "STU-2026-003", first: "Yaw", last: "Ansah", dob: "2013-11-05", sex: "MALE" as const, class: jhs1Class, guardian: guardianB },
    { adm: "STU-2026-004", first: "Abena", last: "Ansah", dob: "2017-02-17", sex: "FEMALE" as const, class: primary1Class, guardian: guardianB },
    { adm: "STU-2026-005", first: "Kwaku", last: "Sarpong", dob: "2014-06-30", sex: "MALE" as const, class: primary6Class, guardian: guardianC },
  ];

  for (const s of studentsData) {
    const student = await prisma.student.upsert({
      where: { admissionNumber: s.adm },
      update: {},
      create: {
        admissionNumber: s.adm,
        firstName: s.first,
        lastName: s.last,
        dateOfBirth: new Date(s.dob),
        sex: s.sex,
        address: "Fictional Residential Address, Ghana",
        admissionDate: new Date("2026-09-01"),
        status: "ACTIVE",
      },
    });

    // Link Student to Guardian
    await prisma.studentGuardian.upsert({
      where: {
        unique_student_guardian: {
          studentId: student.id,
          guardianId: s.guardian.id,
        },
      },
      update: {},
      create: {
        studentId: student.id,
        guardianId: s.guardian.id,
        isPrimary: true,
        relationship: s.guardian.relationship,
      },
    });

    // Enroll in class
    await prisma.enrollment.upsert({
      where: {
        unique_student_class_year_enrollment: {
          studentId: student.id,
          schoolClassId: s.class.id,
          academicYearId: currentYear.id,
        },
      },
      update: {},
      create: {
        studentId: student.id,
        schoolClassId: s.class.id,
        academicYearId: currentYear.id,
        enrollmentDate: new Date("2026-09-02"),
        status: "ENROLLED",
        rollNumber: `ROLL-${s.adm.slice(-3)}`,
      },
    });

    // Seed Attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.attendance.upsert({
      where: {
        unique_student_daily_attendance: {
          studentId: student.id,
          date: today,
        },
      },
      update: {},
      create: {
        studentId: student.id,
        schoolClassId: s.class.id,
        date: today,
        status: "PRESENT",
        remarks: "Attended full day classes",
        recordedById: teacher1.id,
      },
    });
  }

  console.log("✅ Seeding completed successfully with zero duplicates!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
    process.exit(0);
  });
