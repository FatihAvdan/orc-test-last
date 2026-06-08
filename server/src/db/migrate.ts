import fs from "fs";
import path from "path";
import pool from "../config/db";

export async function runMigrations(): Promise<void> {
  const client = await pool.connect();

  try {
    const migrationsDir = path.join(__dirname, "migrations");
    const files = fs.readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();
    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
      await client.query(sql);
    }
    console.log("Migrations applied successfully");
  } catch (err) {
    console.error("Migration error:", err);
    throw err;
  } finally {
    client.release();
  }
}
