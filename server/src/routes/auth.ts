import { Router, type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcryptjs";
import { query } from "../config/db";
import { signToken } from "../config/jwt";
import { AppError } from "../middleware/error-handler";
import type { User, AuthResponse } from "@devfolio/shared";

export const authRouter = Router();

authRouter.post("/register", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      throw new AppError("Email, password, and name are required", 400);
    }
    if (password.length < 6) {
      throw new AppError("Password must be at least 6 characters", 400);
    }

    const existing = await query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      throw new AppError("Email already registered", 409);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       RETURNING id, email, name, created_at, updated_at`,
      [email, passwordHash, name]
    );
    const row = result.rows[0];
    const user: User = {
      id: row.id,
      email: row.email,
      name: row.name,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
    const token = signToken({ userId: user.id, email: user.email });
    const response: AuthResponse = { token, user };
    res.status(201).json({ success: true, data: response });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/login", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      throw new AppError("Email and password are required", 400);
    }

    const result = await query(
      "SELECT id, email, name, password_hash, created_at, updated_at FROM users WHERE email = $1",
      [email]
    );
    if (result.rows.length === 0) {
      throw new AppError("Invalid email or password", 401);
    }

    const row = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, row.password_hash);
    if (!passwordMatch) {
      throw new AppError("Invalid email or password", 401);
    }

    const user: User = {
      id: row.id,
      email: row.email,
      name: row.name,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
    const token = signToken({ userId: user.id, email: user.email });
    const response: AuthResponse = { token, user };
    res.json({ success: true, data: response });
  } catch (err) {
    next(err);
  }
});
