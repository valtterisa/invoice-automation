import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import { getConfig } from "../../shared/config/index.js";
import { logger } from "../logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function migrate(): Promise<void> {
  const config = getConfig();
  const connection = await mysql.createConnection(config.DATABASE_URL);
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS drizzle_migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
      )
    `);

    const migrationsDir = path.join(__dirname, "migrations");
    const files = (await readdir(migrationsDir))
      .filter((f) => f.endsWith(".sql"))
      .sort();

    const [appliedRows] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT hash FROM drizzle_migrations",
    );
    const applied = new Set(appliedRows.map((r) => String(r["hash"])));

    for (const file of files) {
      if (applied.has(file)) {
        continue;
      }
      const sql = await readFile(path.join(migrationsDir, file), "utf8");
      const statements = sql
        .split(/-->\s*statement-breakpoint/)
        .map((s) => s.trim())
        .filter(Boolean);

      for (const statement of statements) {
        await connection.query(statement);
      }
      await connection.query(
        "INSERT INTO drizzle_migrations (hash) VALUES (?)",
        [file],
      );
      logger.info({ file, operation: "migrate" }, "Applied migration");
    }
  } finally {
    await connection.end();
  }
}

migrate().catch((err: unknown) => {
  logger.error({ err, operation: "migrate", error_code: "MIGRATE_FAILED" }, "Migration failed");
  process.exit(1);
});
