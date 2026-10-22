# Database Backup and Restoration Guide

This document outlines the backup, restoration, credential security, and verification procedures for the School Management System (SMS) database running on MySQL 8.0.46 (Windows).

---

## 1. Least-Privileged MySQL Application Account

For production and normal application runtime, never use the `root` administrative account. A dedicated, least-privileged application user should be created with permissions restricted strictly to the `school_management` database.

### Creating the Dedicated User in MySQL:
Run the following SQL commands in MySQL as root:

```sql
-- 1. Create a dedicated application user
CREATE USER 'sms_app'@'localhost' IDENTIFIED BY 'AppUserSecurePassword123!';

-- 2. Grant only necessary DML and DDL privileges on the application database
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES, DROP 
ON `school_management`.* 
TO 'sms_app'@'localhost';

-- 3. Apply privilege changes
FLUSH PRIVILEGES;

-- 4. Verify privileges
SHOW GRANTS FOR 'sms_app'@'localhost';
```

### Updating `.env`:
```env
DATABASE_URL="mysql://sms_app:AppUserSecurePassword123!@localhost:3306/school_management"
```

---

## 2. Secure Local Credential Handling

To adhere to security best practices:
1. **Never hardcode passwords** in shell scripts, PowerShell scripts, or command arguments (which would be visible in Windows Task Manager and command history).
2. **Use Masked Prompting**: The provided scripts prompt for the password using `Read-Host -AsSecureString`.
3. **Alternative: MySQL Login-Path / Option Files**:
   You can configure MySQL `mysql_config_editor` so tools connect without typing a password:
   ```bash
   mysql_config_editor set --login-path=sms_backup --host=localhost --user=root --password
   ```

---

## 3. Creating a Database Backup

### Automated PowerShell Script (Recommended):
Run the provided backup script from the project root:

```powershell
.\database\backup.ps1
```

The script will:
1. Automatically find `mysqldump.exe` in the standard MySQL 8.0 installation path.
2. Prompt for the MySQL password securely without echoing characters.
3. Export database schemas, data, triggers, and routines.
4. Output the timestamped backup file into `database/backups/backup_school_management_YYYYMMDD_HHMMSS.sql`.

### Manual CLI Command:
```cmd
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe" ^
  --host=127.0.0.1 --port=3306 --user=root ^
  --single-transaction --routines --triggers --events ^
  --default-character-set=utf8mb4 ^
  --result-file=database\backups\manual_backup.sql school_management -p
```

---

## 4. Restoring the Database

### Safe Test Restoration (Isolated Test Database):
To verify that a backup is valid without endangering the active database, restore into an isolated database:

```powershell
.\database\restore.ps1 -BackupFilePath ".\database\backups\backup_school_management_20261019_120000.sql" -TargetDatabase "school_management_test"
```

### Restoring to the Main Database:
```powershell
.\database\restore.ps1 -BackupFilePath ".\database\backups\backup_school_management_20261019_120000.sql" -TargetDatabase "school_management"
```
*(The script prompts for explicit user confirmation before overwriting `school_management`)*.

---

## 5. Post-Restoration Verification Checklist

After restoration, execute the verification query to confirm schema and record integrity:

| Table Name | Description | Verification Criterion |
| :--- | :--- | :--- |
| `academic_years` | Academic calendars | Contains at least 1 active academic year |
| `terms` | Academic terms | Contains valid terms linked to academic year |
| `school_classes` | Classes (Preschool to JHS) | Contains classes with level and capacity |
| `subjects` | Subjects offered | Contains core curriculum subjects |
| `staff` | Teaching and administrative staff | Contains staff profiles with staff numbers |
| `students` | Enrolled pupils | Contains student records with admission numbers |
| `guardians` | Parents / guardians | Contains guardian contacts |
| `student_guardians` | Junction records | Junction rows connecting students to guardians |
| `enrollments` | Class enrollments | Student enrollment records for academic years |
| `attendances` | Daily attendance logs | Attendance status logs |
| `users` | System user credentials | Contains admin/teacher accounts with bcrypt hashes |
| `class_subjects` | Class-subject allocations | Subject-to-class mappings |

### Verification SQL Query:
```sql
USE school_management;
SELECT 
    table_name AS 'Table', 
    table_rows AS 'Estimated Rows'
FROM information_schema.tables 
WHERE table_schema = 'school_management'
ORDER BY table_name;
```
