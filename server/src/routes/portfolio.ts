import { Router, Request, Response, NextFunction } from "express";
import {
  Portfolio,
  SocialLink,
  CreatePortfolioRequest,
  UpdatePortfolioRequest,
} from "@devfolio/shared";
import { query } from "../config/db";
import { authMiddleware } from "../middleware/auth";
import { AppError } from "../middleware/error-handler";

export const portfolioRouter = Router();

portfolioRouter.use(authMiddleware);

const SELECT_COLUMNS = `id, user_id, title, slug, description, template, published,
  social_links, seo_title, seo_description, seo_keywords, custom_domain,
  created_at, updated_at`;

function mapPortfolio(row: Record<string, unknown>): Portfolio {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    title: row.title as string,
    slug: (row.slug as string) || "",
    description: row.description as string,
    template: row.template as string,
    published: row.published as boolean,
    socialLinks: parseSocialLinks(row.social_links),
    seoTitle: (row.seo_title as string) || undefined,
    seoDescription: (row.seo_description as string) || undefined,
    seoKeywords: (row.seo_keywords as string) || undefined,
    customDomain: (row.custom_domain as string) || undefined,
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
  };
}

function parseSocialLinks(value: unknown): SocialLink[] {
  if (Array.isArray(value)) return value as SocialLink[];
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  }
  return [];
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 100);
}

portfolioRouter.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;

      const result = await query(
        `SELECT ${SELECT_COLUMNS}
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
        `SELECT ${SELECT_COLUMNS}
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
      const {
        title,
        slug,
        description,
        template,
        socialLinks,
        seoTitle,
        seoDescription,
        seoKeywords,
        customDomain,
      }: CreatePortfolioRequest = req.body;

      if (!title) {
        throw new AppError("Title is required", 400);
      }

      const finalSlug = slug || generateSlug(title);

      if (finalSlug) {
        const existing = await query(
          "SELECT id FROM portfolios WHERE slug = $1",
          [finalSlug]
        );
        if (existing.rows.length > 0) {
          throw new AppError("A portfolio with this slug already exists", 409);
        }
      }

      const result = await query(
        `INSERT INTO portfolios (user_id, title, slug, description, template, social_links, seo_title, seo_description, seo_keywords, custom_domain)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING ${SELECT_COLUMNS}`,
        [
          userId,
          title,
          finalSlug,
          description || "",
          template || "default",
          JSON.stringify(socialLinks || []),
          seoTitle || null,
          seoDescription || null,
          seoKeywords || null,
          customDomain || null,
        ]
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
      if (updates.slug !== undefined) {
        if (updates.slug) {
          const slugConflict = await query(
            "SELECT id FROM portfolios WHERE slug = $1 AND id != $2",
            [updates.slug, id]
          );
          if (slugConflict.rows.length > 0) {
            throw new AppError("A portfolio with this slug already exists", 409);
          }
        }
        setClauses.push(`slug = $${paramIndex++}`);
        values.push(updates.slug);
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
      if (updates.socialLinks !== undefined) {
        setClauses.push(`social_links = $${paramIndex++}`);
        values.push(JSON.stringify(updates.socialLinks));
      }
      if (updates.seoTitle !== undefined) {
        setClauses.push(`seo_title = $${paramIndex++}`);
        values.push(updates.seoTitle || null);
      }
      if (updates.seoDescription !== undefined) {
        setClauses.push(`seo_description = $${paramIndex++}`);
        values.push(updates.seoDescription || null);
      }
      if (updates.seoKeywords !== undefined) {
        setClauses.push(`seo_keywords = $${paramIndex++}`);
        values.push(updates.seoKeywords || null);
      }
      if (updates.customDomain !== undefined) {
        setClauses.push(`custom_domain = $${paramIndex++}`);
        values.push(updates.customDomain || null);
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
         RETURNING ${SELECT_COLUMNS}`,
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

portfolioRouter.put(
  "/:id/domain",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const { domain } = req.body;

      if (!domain || typeof domain !== "string") {
        throw new AppError("Domain is required", 400);
      }

      const domainRegex =
        /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
      if (!domainRegex.test(domain)) {
        throw new AppError("Invalid domain format", 400);
      }

      const existing = await query(
        "SELECT id FROM portfolios WHERE custom_domain = $1 AND id != $2",
        [domain, id]
      );
      if (existing.rows.length > 0) {
        throw new AppError("This domain is already in use", 409);
      }

      const result = await query(
        `UPDATE portfolios SET custom_domain = $1, updated_at = NOW()
         WHERE id = $2 AND user_id = $3
         RETURNING ${SELECT_COLUMNS}`,
        [domain, id, userId]
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
