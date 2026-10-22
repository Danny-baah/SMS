import mariadb, { type Pool } from "mariadb";
import { parseConnectionString } from "../db";

export interface SyntheticRecord {
  id: number;
  synthetic_username: string;
  synthetic_role: string;
  synthetic_secret: string;
}

/**
 * Isolated Security Lab for SQL Injection Demonstration and Resolution.
 * Strictly uses an isolated test database (school_management_test) with dummy mock data.
 * NEVER connects to, modifies, or deletes the active school_management database.
 */
export class SqlInjectionLab {
  private pool: Pool | null = null;
  private tableName = "_security_lab_synthetic_users";
  private dbName: string;
  private connectionString: string;

  constructor(connectionString?: string) {
    this.connectionString =
      connectionString ||
      process.env.TEST_DATABASE_URL ||
      "mysql://root:danny1234@localhost:3306/school_management_test";
    const poolConfig = parseConnectionString(this.connectionString);
    this.dbName = poolConfig.database || "school_management_test";
  }

  /**
   * Initializes the disposable synthetic table in the isolated test database.
   */
  async setupSyntheticEnvironment(): Promise<void> {
    const rawConfig = parseConnectionString(this.connectionString);
    // Connect without specific database to create the isolated test database if needed
    const serverPool = mariadb.createPool({
      ...rawConfig,
      database: undefined,
    });

    const serverConn = await serverPool.getConnection();
    try {
      await serverConn.query(`CREATE DATABASE IF NOT EXISTS \`${this.dbName}\`;`);
    } finally {
      serverConn.release();
      await serverPool.end();
    }

    // Now connect to the isolated test database
    this.pool = mariadb.createPool({
      ...rawConfig,
      database: this.dbName,
    });

    const conn = await this.pool.getConnection();
    try {
      await conn.query(`
        CREATE TABLE IF NOT EXISTS ${this.tableName} (
          id INT AUTO_INCREMENT PRIMARY KEY,
          synthetic_username VARCHAR(50) NOT NULL,
          synthetic_role VARCHAR(20) NOT NULL,
          synthetic_secret VARCHAR(100) NOT NULL
        ) ENGINE=InnoDB;
      `);

      // Clear previous synthetic test runs
      await conn.query(`TRUNCATE TABLE ${this.tableName};`);

      // Insert isolated synthetic test rows
      await conn.query(`
        INSERT INTO ${this.tableName} (synthetic_username, synthetic_role, synthetic_secret) VALUES
        ('alice_mock', 'STUDENT', 'synthetic-token-secret-alpha'),
        ('bob_mock', 'TEACHER', 'synthetic-token-secret-beta'),
        ('charlie_mock', 'ADMIN', 'synthetic-token-secret-gamma');
      `);
    } finally {
      conn.release();
    }
  }

  /**
   * VULNERABLE IMPLEMENTATION (Demonstration only, on synthetic table in test DB):
   * Concatenates raw user input directly into SQL statement.
   * A payload like "' OR '1'='1" alters query logic and leaks all records.
   */
  async unsafeSearch(rawUserInput: string): Promise<SyntheticRecord[]> {
    if (!this.pool) throw new Error("Pool not initialized");
    const conn = await this.pool.getConnection();
    try {
      const unsafeQuery = `SELECT id, synthetic_username, synthetic_role, synthetic_secret FROM ${this.tableName} WHERE synthetic_username = '${rawUserInput}'`;
      const rows = await conn.query(unsafeQuery);
      return rows as SyntheticRecord[];
    } finally {
      conn.release();
    }
  }

  /**
   * SECURE RESOLUTION (Parameterized Query):
   * User input is passed as a bound parameter (placeholder ?).
   * Database engine treats the input strictly as literal string data, never executable syntax.
   */
  async safeParameterizedSearch(userInput: string): Promise<SyntheticRecord[]> {
    if (!this.pool) throw new Error("Pool not initialized");
    const conn = await this.pool.getConnection();
    try {
      const safeQuery = `SELECT id, synthetic_username, synthetic_role, synthetic_secret FROM ${this.tableName} WHERE synthetic_username = ?`;
      const rows = await conn.query(safeQuery, [userInput]);
      return rows as SyntheticRecord[];
    } finally {
      conn.release();
    }
  }

  /**
   * Cleans up the synthetic table after testing.
   */
  async teardownSyntheticEnvironment(): Promise<void> {
    if (!this.pool) return;
    const conn = await this.pool.getConnection();
    try {
      await conn.query(`DROP TABLE IF EXISTS ${this.tableName};`);
    } finally {
      conn.release();
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}
