import { Router, type Request, type Response, type NextFunction } from "express";
import { query } from "../config/db";
import { authMiddleware } from "../middleware/auth";
import { AppError } from "../middleware/error-handler";
import type { Portfolio } from "@devfolio/shared";

export const portfolioRouter = Router();

portfolioRouter.use(authMiddleware);

function mapPortfolio(row: any): Portfolio {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    template: row.template,
    published: row.published,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

portfolioRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const result = await query(
      `SELECT id, user_id, title, description, template, published, created_at, updated_at
       FROM portfolios
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    const portfolios = result.rows.map(mapPortfolio);
    res.json({ success: true, data: portfolios });
  } catch (err) {
    next(err);
  }
});

portfolioRouter.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const result = await query(
      `SELECT id, user_id, title, description, template, published, created_at, updated_at
       FROM portfolios
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (result.rows.length === 0) {
      throw new AppError("Portfolio not found", 404);
    }
    const portfolio = mapPortfolio(result.rows[0]);
    res.json({ success: true, data: portfolio });
  } catch (err) {
    next(err);
  }
});

portfolioRouter.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { title, description, template } = req.body;
    if (!title) {
      throw new AppError("Title is required", 400);
    }
    const result = await query(
      `INSERT INTO portfolios (user_id, title, description, template)
       VALUES ($1, $2, $3, $4)
       RETURNING id, user_id, title, description, template, published, created_at, updated_at`,
      [userId, title, description || "", template || "default"]
    );
    const portfolio = mapPortfolio(result.rows[0]);
    res.status(201).json({ success: true, data: portfolio });
  } catch (err) {
    next(err);
  }
});

portfolioRouter.put("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const updates = req.body;

    const existing = await query(
      "SELECT id FROM portfolios WHERE id = $1 AND user_id = $2",
      [id, userId]
    );
    if (existing.rows.length === 0) {
      throw new AppError("Portfolio not found", 404);
    }

    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.title !== undefined) {
      setClauses.push(`title = $${paramIndex++}`);
      values.push(updates.title);
    }
    if (updates.description !== undefined) {
      setClauses.push(`description = $${paramIndex++}`);
      values.push(updates.description);
    }
    if (updates.template !== undefined) {
      setClauses.push(`template = $${paramIndex++}`);
      values.push(updates.template);
    }
    if (updates.published !== undefined) {
      setClauses.push(`published = $${paramIndex++}`);
      values.push(updates.published);
    }

    if (setClauses.length === 0) {
      throw new AppError("No fields to update", 400);
    }

    setClauses.push("updated_at = NOW()");
    values.push(id);
    values.push(userId);

    const result = await query(
      `UPDATE portfolios
       SET ${setClauses.join(", ")}
       WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
       RETURNING id, user_id, title, description, template, published, created_at, updated_at`,
      values
    );
    const portfolio = mapPortfolio(result.rows[0]);
    res.json({ success: true, data: portfolio });
  } catch (err) {
    next(err);
  }
});

portfolioRouter.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const result = await query(
      "DELETE FROM portfolios WHERE id = $1 AND user_id = $2 RETURNING id",
      [id, userId]
    );
    if (result.rows.length === 0) {
      throw new AppError("Portfolio not found", 404);
    }
    res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    next(err);
  }
});
