import { Router, Request, Response, NextFunction } from "express";
import { PostData, PostTag, CreatePostRequest } from "@devfolio/shared";
import { query } from "../config/db";
import { authMiddleware } from "../middleware/auth";
import { AppError } from "../middleware/error-handler";

export const blogRouter = Router();

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

async function resolveTags(tagNames: string[]): Promise<string[]> {
  const ids: string[] = [];
  for (const name of tagNames) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    const slug = slugify(trimmed);
    const existing = await query("SELECT id FROM blog_tags WHERE slug = $1", [slug]);
    if (existing.rows.length > 0) {
      ids.push(existing.rows[0].id);
    } else {
      const result = await query(
        "INSERT INTO blog_tags (name, slug) VALUES ($1, $2) RETURNING id",
        [trimmed, slug]
      );
      ids.push(result.rows[0].id);
    }
  }
  return ids;
}

async function attachTags(postId: string, tagIds: string[]): Promise<void> {
  await query("DELETE FROM blog_post_tags WHERE post_id = $1", [postId]);
  for (const tagId of tagIds) {
    await query(
      "INSERT INTO blog_post_tags (post_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [postId, tagId]
    );
  }
}

async function getTagsForPost(postId: string): Promise<PostTag[]> {
  const result = await query(
    `SELECT t.id, t.name, t.slug FROM blog_tags t
     INNER JOIN blog_post_tags pt ON pt.tag_id = t.id
     WHERE pt.post_id = $1`,
    [postId]
  );
  return result.rows.map((r) => ({ id: r.id, name: r.name, slug: r.slug }));
}

function mapPost(row: Record<string, unknown>, tags: PostTag[]): PostData {
  return {
    id: row.id as string,
    authorId: row.author_id as string,
    title: row.title as string,
    slug: row.slug as string,
    content: row.content as string,
    excerpt: (row.excerpt as string) || undefined,
    coverImage: (row.cover_image as string) || undefined,
    isPublished: row.is_published as boolean,
    publishedAt: row.published_at ? (row.published_at as Date).toISOString() : undefined,
    tags,
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
  };
}

// Public routes
blogRouter.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Math.max(Number(req.query.page) || 1, 1);
      const pageSize = Math.min(Math.max(Number(req.query.pageSize) || 10, 1), 50);
      const tag = req.query.tag as string | undefined;
      const offset = (page - 1) * pageSize;

      let whereClause = "WHERE p.is_published = true";
      const params: unknown[] = [];
      let pIdx = 1;

      if (tag) {
        whereClause += ` AND EXISTS (SELECT 1 FROM blog_post_tags pt
          INNER JOIN blog_tags t ON t.id = pt.tag_id
          WHERE pt.post_id = p.id AND t.slug = $${pIdx++})`;
        params.push(tag);
      }

      const countResult = await query(
        `SELECT COUNT(*)::int as count FROM blog_posts p ${whereClause}`,
        params
      );
      const total = Number(countResult.rows[0].count);

      const postsResult = await query(
        `SELECT p.id, p.author_id, p.title, p.slug, p.content, p.excerpt, p.cover_image,
                p.is_published, p.published_at, p.created_at, p.updated_at,
                u.name as author_name
         FROM blog_posts p
         LEFT JOIN users u ON u.id = p.author_id
         ${whereClause}
         ORDER BY p.published_at DESC NULLS LAST
         LIMIT $${pIdx++} OFFSET $${pIdx++}`,
        [...params, pageSize, offset]
      );

      const posts: PostData[] = [];
      for (const row of postsResult.rows) {
        const tags = await getTagsForPost(row.id);
        posts.push(mapPost(row, tags));
      }

      res.json({ success: true, data: posts, page, pageSize, total });
    } catch (err) {
      next(err);
    }
  }
);

blogRouter.get(
  "/tags",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await query(
        `SELECT t.id, t.name, t.slug, COUNT(pt.post_id)::int as post_count
         FROM blog_tags t
         LEFT JOIN blog_post_tags pt ON pt.tag_id = t.id
         GROUP BY t.id ORDER BY t.name`
      );
      res.json({ success: true, data: result.rows });
    } catch (err) {
      next(err);
    }
  }
);

blogRouter.get(
  "/slug/:slug",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { slug } = req.params;
      const result = await query(
        `SELECT p.*, u.name as author_name FROM blog_posts p
         LEFT JOIN users u ON u.id = p.author_id
         WHERE p.slug = $1 AND p.is_published = true`,
        [slug]
      );
      if (result.rows.length === 0) {
        throw new AppError("Post not found", 404);
      }
      const tags = await getTagsForPost(result.rows[0].id);
      res.json({ success: true, data: mapPost(result.rows[0], tags) });
    } catch (err) {
      next(err);
    }
  }
);

blogRouter.get(
  "/rss.xml",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await query(
        `SELECT p.*, u.name as author_name FROM blog_posts p
         LEFT JOIN users u ON u.id = p.author_id
         WHERE p.is_published = true
         ORDER BY p.published_at DESC LIMIT 20`
      );

      const baseUrl = process.env.BASE_URL || "http://localhost:3000";
      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n<channel>\n`;
      xml += `<title>DevFolio Blog</title>\n<link>${escapeXml(baseUrl)}</link>\n`;
      xml += `<description>Latest blog posts</description>\n`;

      for (const row of result.rows) {
        const pubDate = row.published_at
          ? new Date(row.published_at).toUTCString()
          : new Date(row.created_at).toUTCString();
        xml += `<item>\n`;
        xml += `<title>${escapeXml(row.title)}</title>\n`;
        xml += `<link>${escapeXml(baseUrl)}/blog/${escapeXml(row.slug)}</link>\n`;
        xml += `<description>${escapeXml(row.excerpt || row.content.slice(0, 200))}</description>\n`;
        xml += `<pubDate>${pubDate}</pubDate>\n`;
        xml += `<guid>${escapeXml(baseUrl)}/blog/${escapeXml(row.slug)}</guid>\n`;
        xml += `</item>\n`;
      }
      xml += `</channel>\n</rss>`;

      res.setHeader("Content-Type", "application/rss+xml");
      res.send(xml);
    } catch (err) {
      next(err);
    }
  }
);

// Admin routes (authenticated)
blogRouter.get(
  "/admin",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const result = await query(
        `SELECT p.*, u.name as author_name FROM blog_posts p
         LEFT JOIN users u ON u.id = p.author_id
         WHERE p.author_id = $1
         ORDER BY p.created_at DESC`,
        [userId]
      );
      const posts: PostData[] = [];
      for (const row of result.rows) {
        const tags = await getTagsForPost(row.id);
        posts.push(mapPost(row, tags));
      }
      res.json({ success: true, data: posts });
    } catch (err) {
      next(err);
    }
  }
);

blogRouter.get(
  "/admin/:id",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const result = await query(
        "SELECT * FROM blog_posts WHERE id = $1 AND author_id = $2",
        [id, userId]
      );
      if (result.rows.length === 0) {
        throw new AppError("Post not found", 404);
      }
      const tags = await getTagsForPost(result.rows[0].id);
      res.json({ success: true, data: mapPost(result.rows[0], tags) });
    } catch (err) {
      next(err);
    }
  }
);

blogRouter.post(
  "/admin",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { title, content, excerpt, coverImage, isPublished, tags: tagNames }: CreatePostRequest = req.body;

      if (!title || !content) {
        throw new AppError("Title and content are required", 400);
      }

      let slug = slugify(title);
      const existing = await query("SELECT id FROM blog_posts WHERE slug = $1", [slug]);
      if (existing.rows.length > 0) {
        slug = `${slug}-${Date.now().toString(36)}`;
        while (
          (await query("SELECT id FROM blog_posts WHERE slug = $1", [slug])).rows.length > 0
        ) {
          slug = `${slugify(title)}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
        }
      }

      const result = await query(
        `INSERT INTO blog_posts (author_id, title, slug, content, excerpt, cover_image, is_published, published_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          userId,
          title,
          slug,
          content,
          excerpt || null,
          coverImage || null,
          isPublished || false,
          isPublished ? new Date().toISOString() : null,
        ]
      );

      if (tagNames && tagNames.length > 0) {
        const tagIds = await resolveTags(tagNames);
        await attachTags(result.rows[0].id, tagIds);
      }

      const tags = await getTagsForPost(result.rows[0].id);
      const post = mapPost(result.rows[0], tags);
      res.status(201).json({ success: true, data: post });
    } catch (err) {
      next(err);
    }
  }
);

blogRouter.put(
  "/admin/:id",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const { title, content, excerpt, coverImage, isPublished, tags: tagNames } = req.body;

      const existing = await query(
        "SELECT * FROM blog_posts WHERE id = $1 AND author_id = $2",
        [id, userId]
      );
      if (existing.rows.length === 0) {
        throw new AppError("Post not found", 404);
      }

      const setClauses: string[] = [];
      const values: unknown[] = [];
      let p = 1;

      if (title !== undefined) {
        setClauses.push(`title = $${p++}`);
        values.push(title);
      }
      if (content !== undefined) {
        setClauses.push(`content = $${p++}`);
        values.push(content);
      }
      if (excerpt !== undefined) {
        setClauses.push(`excerpt = $${p++}`);
        values.push(excerpt || null);
      }
      if (coverImage !== undefined) {
        setClauses.push(`cover_image = $${p++}`);
        values.push(coverImage || null);
      }
      if (isPublished !== undefined) {
        setClauses.push(`is_published = $${p++}`);
        values.push(isPublished);
        if (isPublished && !existing.rows[0].published_at) {
          setClauses.push(`published_at = NOW()`);
        } else if (!isPublished) {
          setClauses.push(`published_at = NULL`);
        }
      }

      if (setClauses.length > 0) {
        setClauses.push(`updated_at = NOW()`);
        values.push(id);
        await query(
          `UPDATE blog_posts SET ${setClauses.join(", ")} WHERE id = $${p}`,
          values
        );
      }

      if (tagNames !== undefined) {
        const tagIds = await resolveTags(tagNames);
        await attachTags(id, tagIds);
      }

      const updated = await query("SELECT * FROM blog_posts WHERE id = $1", [id]);
      const tags = await getTagsForPost(id);
      const post = mapPost(updated.rows[0], tags);
      res.json({ success: true, data: post });
    } catch (err) {
      next(err);
    }
  }
);

blogRouter.delete(
  "/admin/:id",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const result = await query(
        "DELETE FROM blog_posts WHERE id = $1 AND author_id = $2 RETURNING id",
        [id, userId]
      );
      if (result.rows.length === 0) {
        throw new AppError("Post not found", 404);
      }

      res.json({ success: true, data: { deleted: true } });
    } catch (err) {
      next(err);
    }
  }
);
