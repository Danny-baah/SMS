# SQL Injection Demonstration & Resolution Security Lab

## 1. Overview of SQL Injection (SQLi)

SQL Injection occurs when untrusted user input is directly concatenated or interpolated into a dynamic database query string without proper escaping or parameter binding. This allows an attacker to break out of the intended data context and manipulate the structure and logic of the SQL statement executed by the database engine.

### Impact of SQL Injection:
- **Authentication Bypass**: An attacker can log in as any user (including `admin`) without knowing credentials.
- **Data Exfiltration**: Unauthorized reading of sensitive records, student personal information, and credentials.
- **Data Tampering & Destruction**: Unauthorized modification or irreversible deletion of database tables (`DROP TABLE`, `DELETE FROM`).
- **Remote Code Execution**: In severe configurations, attackers can leverage database functions to execute arbitrary commands on the underlying host operating system.

---

## 2. Attack Scenario: Altering Query Logic

Consider an authentication query intended to check if a user with a given username exists:

```sql
SELECT id, username, role, password_hash 
FROM users 
WHERE username = '$USER_INPUT';
```

### The Unsafe Construction:
When an application constructs this query using string concatenation or template literals:

```ts
const sql = "SELECT * FROM users WHERE username = '" + userInput + "'";
```

### Malicious Payload:
An attacker enters the following payload into the `username` field:
```text
' OR '1'='1
```

### Resulting Query Executed by MySQL:
```sql
SELECT * FROM users WHERE username = '' OR '1'='1';
```

### How the Logic is Altered:
1. `'` closes the intended string literal.
2. `OR '1'='1'` introduces a boolean condition that is **always true**.
3. Instead of evaluating whether `username` matches a legitimate user, the condition evaluates to `TRUE` for every row in the table.
4. The database returns all records in the table, effectively bypassing authentication or leaking private data.

---

## 3. The Isolated Security Lab Implementation

In accordance with strict security standards:
- **No live application route is exposed to SQL injection.**
- The security lab runs within an isolated, disposable synthetic table (`_security_lab_synthetic_users`) populated with synthetic mock records (`alice_mock`, `bob_mock`, `charlie_mock`).
- Real school management tables (`students`, `guardians`, `staff`, `school_classes`, `users`, etc.) are completely separated and never exposed to the lab.

### Code Comparison

#### ❌ Vulnerable Implementation (`unsafeSearch`):
```typescript
// DANGEROUS: String interpolation directly incorporates raw user input into SQL text
const unsafeQuery = `SELECT id, synthetic_username, synthetic_role, synthetic_secret 
                     FROM _security_lab_synthetic_users 
                     WHERE synthetic_username = '${rawUserInput}'`;
const rows = await conn.query(unsafeQuery);
```

#### ✅ Secure Corrected Implementation (`safeParameterizedSearch`):
```typescript
// SECURE: Parameterized query with bound placeholder (?)
const safeQuery = `SELECT id, synthetic_username, synthetic_role, synthetic_secret 
                   FROM _security_lab_synthetic_users 
                   WHERE synthetic_username = ?`;
const rows = await conn.query(safeQuery, [userInput]);
```

---

## 4. Why Parameterization Neutralizes SQL Injection

When using parameterized queries (prepared statements):
1. **Compilation Step**: The database engine compiles and parses the query structure *before* the input values are received. The syntax tree is fixed.
2. **Execution Step**: The database engine treats the parameters strictly as *literal values* (data), never as executable code or control syntax.
3. When the attacker submits `' OR '1'='1`, MySQL searches for a user whose literal username literally equals the 11 characters `"' OR '1'='1"`. Since no user has that exact name, zero rows are returned, and the attack fails completely.

---

## 5. Automated Test Verification

The repository includes an automated verification test in `tests/sql-injection.test.ts`.

### Running the Test:
```bash
npm run test:security
```

### Verified Test Results:
| Test Case | Input Payload | Query Type | Expected Behavior | Observed Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Legitimate Search** | `'alice_mock'` | Parameterized | Returns exactly 1 matching record | 1 record returned | **PASSED** |
| **2. Injection on Unsafe Query** | `' OR '1'='1` | String Concatenation | Alters query logic, leaks all records | Leaked all 3 synthetic records | **VULNERABILITY CONFIRMED** |
| **3. Injection on Secure Query** | `' OR '1'='1` | Parameterized (`?`) | Payload treated strictly as literal data | 0 records returned (Neutralized) | **PASSED** |
| **4. Union-Based Injection** | `' UNION SELECT 999...` | Parameterized (`?`) | Treated as literal string | 0 records returned | **PASSED** |
| **5. Environment Cleanup** | Synthetic Table Teardown | `DROP TABLE` | Synthetic table removed safely | No application data modified | **PASSED** |

---

## 6. Safe Coding Guidelines in This Project

1. **ORM Standard**: All standard application CRUD operations use Prisma ORM (`prisma.student.findMany()`, `prisma.enrollment.create()`), which automatically generates parameterized SQL queries under the hood.
2. **Raw SQL Policy**: If raw SQL queries are ever needed, Prisma's tagged template literal `$queryRaw` or MariaDB parameterized queries (`conn.query(sql, [params])`) must be used. String interpolation (`$queryRawUnsafe`) is strictly prohibited.
3. **Defense in Depth**: Zod validation is applied at the API boundary, enforcing strict types, formats, and character limits before data ever reaches the database layer.
