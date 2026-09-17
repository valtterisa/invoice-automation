import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/infrastructure/db/schema/index.ts",
  out: "./src/infrastructure/db/migrations",
  dialect: "mysql",
  dbCredentials: {
    url:
      process.env["DATABASE_URL"] ??
      "mysql://invoice:invoice@127.0.0.1:3306/invoice_agent",
  },
});
