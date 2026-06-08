import fs from "fs";
import path from "path";
import pool from "../config/db";

export async function runMigrations(): Promise<void> {
  const client = await pool.connect();

  try {
    const migrationPath = path.join(__dirname, "migrations", "001_init.sql");
    const sql = fs.readFileSync(migrationPath, "utf-8");
    await client.query(sql);
    console.log("Migrations applied successfully");
  } catch (err) {
    console.error("Migration error:", err);
    throw err;
  } finally {
    client.release();
  }
}
