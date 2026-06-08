import { Router, Request, Response, NextFunction } from "express";
import {
  Portfolio,
  CreatePortfolioRequest,
  UpdatePortfolioRequest,
} from "@devfolio/shared";
import { query } from "../config/db";
import { authMiddleware } from "../middleware/auth";
import { AppError } from "../middleware/error-handler";

export const portfolioRouter = Router();

portfolioRouter.use(authMiddleware);

portfolioRouter.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;

      const result = await query(
        `SELECT id, user_id, title, description, template, published, created_at, updated_at
         FROM portfolios
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [userId]
      );

      const portfolios: Portfolio[] = result.rows.map(mapPortfolio);
      res.json({ success: true, data: portfolios });
    } catch (err) {
      next(err);
    }
  }
);

portfolioRouter.get(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
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

      const portfolio: Portfolio = mapPortfolio(result.rows[0]);
      res.json({ success: true, data: portfolio });
    } catch (err) {
      next(err);
    }
  }
);

portfolioRouter.post(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { title, description, template }: CreatePortfolioRequest = req.body;

      if (!title) {
        throw new AppError("Title is required", 400);
      }

      const result = await query(
        `INSERT INTO portfolios (user_id, title, description, template)
         VALUES ($1, $2, $3, $4)
         RETURNING id, user_id, title, description, template, published, created_at, updated_at`,
        [userId, title, description || "", template || "default"]
      );

      const portfolio: Portfolio = mapPortfolio(result.rows[0]);
      res.status(201).json({ success: true, data: portfolio });
    } catch (err) {
      next(err);
    }
  }
);

portfolioRouter.put(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const updates: UpdatePortfolioRequest = req.body;

      const existing = await query(
        "SELECT id FROM portfolios WHERE id = $1 AND user_id = $2",
        [id, userId]
      );

      if (existing.rows.length === 0) {
        throw new AppError("Portfolio not found", 404);
      }

      const setClauses: string[] = [];
      const values: unknown[] = [];
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

      setClauses.push(`updated_at = NOW()`);
      values.push(id);
      values.push(userId);

      const result = await query(
        `UPDATE portfolios
         SET ${setClauses.join(", ")}
         WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
         RETURNING id, user_id, title, description, template, published, created_at, updated_at`,
        values
      );

      const portfolio: Portfolio = mapPortfolio(result.rows[0]);
      res.json({ success: true, data: portfolio });
    } catch (err) {
      next(err);
    }
  }
);

portfolioRouter.delete(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
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
  }
);

function mapPortfolio(row: Record<string, unknown>): Portfolio {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    title: row.title as string,
    description: row.description as string,
    template: row.template as string,
    published: row.published as boolean,
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
  };
}
