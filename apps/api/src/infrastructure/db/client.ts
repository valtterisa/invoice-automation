import mysql from "mysql2/promise";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import { getConfig } from "../../shared/config/index.js";
import * as schema from "./schema/index.js";

export type Db = MySql2Database<typeof schema>;

let pool: mysql.Pool | undefined;
let db: Db | undefined;

export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool(getConfig().DATABASE_URL);
  }
  return pool;
}

export function getDb(): Db {
  if (!db) {
    db = drizzle({ client: getPool(), schema, mode: "default" });
  }
  return db;
}

export async function pingDb(): Promise<boolean> {
  const connection = await getPool().getConnection();
  try {
    await connection.ping();
    return true;
  } finally {
    connection.release();
  }
}

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
    db = undefined;
  }
}
