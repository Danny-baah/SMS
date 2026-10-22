import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import mariadb, { type Pool, type PoolConfig } from "mariadb";
import { PrismaClient } from "../../generated/prisma/client";

/**
 * Parses MySQL connection string into options compatible with mariadb connection pool.
 */
export function parseConnectionString(connectionString: string): PoolConfig {
  try {
    const url = new URL(connectionString);
    const isRemote = url.hostname && url.hostname !== "localhost" && url.hostname !== "127.0.0.1";
    const sslRequired = url.searchParams.get("ssl-mode") === "REQUIRED" || url.searchParams.get("ssl") === "true" || isRemote;

    const config: PoolConfig = {
      host: url.hostname || "localhost",
      port: url.port ? parseInt(url.port, 10) : 3306,
      user: decodeURIComponent(url.username || "root"),
      password: decodeURIComponent(url.password || ""),
      database: dbName || "school_management",
      connectionLimit: 10,
      allowPublicKeyRetrieval: true,
      connectTimeout: 10000,
    };

    if (sslRequired) {
      config.ssl = { rejectUnauthorized: false };
    }

    return config;
  } catch {
    // If standard URL parsing fails, format default localhost config
    return {
      host: "localhost",
      port: 3306,
      user: "root",
      password: "",
      database: "school_management",
    };
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  mariadbPool?: Pool;
};

export function getDbClient(overrideUrl?: string): { prisma: PrismaClient; pool: Pool } {
  const connStr = overrideUrl || process.env.DATABASE_URL || "mysql://root:@localhost:3306/school_management";
  const poolConfig = parseConnectionString(connStr);
  const pool = mariadb.createPool(poolConfig);
  const adapter = new PrismaMariaDb(pool);
  const client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
  return { prisma: client, pool };
}

export const prisma = globalForPrisma.prisma ?? getDbClient().prisma;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
