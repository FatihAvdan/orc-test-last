import { Router, Request, Response, NextFunction } from "express";
import { SocialLinkData } from "@devfolio/shared";
import { query } from "../config/db";
import { authMiddleware } from "../middleware/auth";
import { AppError } from "../middleware/error-handler";

export const socialRouter = Router();

socialRouter.use(authMiddleware);

socialRouter.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const result = await query(
        `SELECT id, user_id, platform, url, label, sort_order, created_at, updated_at
         FROM social_links WHERE user_id = $1 ORDER BY sort_order`,
        [userId]
      );
      const data: SocialLinkData[] = result.rows.map(mapSocialLink);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

socialRouter.post(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { platform, url, label } = req.body;

      if (!platform || !url) {
        throw new AppError("Platform and URL are required", 400);
      }

      const maxOrder = await query(
        "SELECT COALESCE(MAX(sort_order), -1) as max_order FROM social_links WHERE user_id = $1",
        [userId]
      );

      const result = await query(
        `INSERT INTO social_links (user_id, platform, url, label, sort_order)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, user_id, platform, url, label, sort_order, created_at, updated_at`,
        [userId, platform, url, label || null, Number(maxOrder.rows[0].max_order) + 1]
      );

      const data: SocialLinkData = mapSocialLink(result.rows[0]);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

socialRouter.put(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const { platform, url, label, sortOrder } = req.body;

      const existing = await query(
        "SELECT id FROM social_links WHERE id = $1 AND user_id = $2",
        [id, userId]
      );
      if (existing.rows.length === 0) {
        throw new AppError("Social link not found", 404);
      }

      const setClauses: string[] = [];
      const values: unknown[] = [];
      let p = 1;

      if (platform !== undefined) {
        setClauses.push(`platform = $${p++}`);
        values.push(platform);
      }
      if (url !== undefined) {
        setClauses.push(`url = $${p++}`);
        values.push(url);
      }
      if (label !== undefined) {
        setClauses.push(`label = $${p++}`);
        values.push(label);
      }
      if (sortOrder !== undefined) {
        setClauses.push(`sort_order = $${p++}`);
        values.push(sortOrder);
      }

      if (setClauses.length === 0) {
        throw new AppError("No fields to update", 400);
      }

      setClauses.push(`updated_at = NOW()`);
      values.push(id);

      const result = await query(
        `UPDATE social_links SET ${setClauses.join(", ")}
         WHERE id = $${p}
         RETURNING id, user_id, platform, url, label, sort_order, created_at, updated_at`,
        values
      );

      const data: SocialLinkData = mapSocialLink(result.rows[0]);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

socialRouter.delete(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const result = await query(
        "DELETE FROM social_links WHERE id = $1 AND user_id = $2 RETURNING id",
        [id, userId]
      );
      if (result.rows.length === 0) {
        throw new AppError("Social link not found", 404);
      }

      res.json({ success: true, data: { deleted: true } });
    } catch (err) {
      next(err);
    }
  }
);

function mapSocialLink(row: Record<string, unknown>): SocialLinkData {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    platform: row.platform as string,
    url: row.url as string,
    label: (row.label as string) || undefined,
    sortOrder: Number(row.sort_order),
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
  };
}
