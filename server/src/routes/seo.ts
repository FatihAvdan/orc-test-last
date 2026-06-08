import { Router, Request, Response, NextFunction } from "express";
import { query } from "../config/db";

export const seoRouter = Router();

seoRouter.get(
  "/robots.txt",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const baseUrl = process.env.BASE_URL || "http://localhost:3000";
      const content = `User-agent: *
Allow: /
Disallow: /api/
Sitemap: ${baseUrl}/sitemap.xml`;

      res.setHeader("Content-Type", "text/plain");
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.send(content);
    } catch (err) {
      next(err);
    }
  }
);

seoRouter.get(
  "/sitemap.xml",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const baseUrl = process.env.BASE_URL || "http://localhost:3000";

      const portResult = await query(
        "SELECT slug, updated_at FROM portfolios WHERE slug IS NOT NULL AND published = true"
      );
      const blogResult = await query(
        "SELECT slug, updated_at FROM blog_posts WHERE is_published = true"
      );

      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
      xml += `<url><loc>${baseUrl}</loc><changefreq>daily</changefreq><priority>1.0</priority></url>\n`;

      for (const row of portResult.rows) {
        xml += `<url><loc>${baseUrl}/p/${row.slug}</loc><lastmod>${
          new Date(row.updated_at).toISOString().split("T")[0]
        }</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>\n`;
      }

      for (const row of blogResult.rows) {
        xml += `<url><loc>${baseUrl}/blog/${row.slug}</loc><lastmod>${
          new Date(row.updated_at).toISOString().split("T")[0]
        }</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>\n`;
      }

      xml += `</urlset>`;

      res.setHeader("Content-Type", "application/xml");
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.send(xml);
    } catch (err) {
      next(err);
    }
  }
);

seoRouter.get(
  "/portfolios/:slug/jsonld",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { slug } = req.params;
      const baseUrl = process.env.BASE_URL || "http://localhost:3000";

      const result = await query(
        `SELECT p.*, u.name as owner_name, u.email as owner_email
         FROM portfolios p
         INNER JOIN users u ON u.id = p.user_id
         WHERE p.slug = $1 AND p.published = true`,
        [slug]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ success: false, error: "Portfolio not found" });
        return;
      }

      const row = result.rows[0];

      const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Person",
        name: row.owner_name,
        description: row.description,
        url: `${baseUrl}/p/${row.slug}`,
        knowsAbout: [] as string[],
        subjectOf: [] as Record<string, string>[],
      };

      const projectsResult = await query(
        "SELECT title, description, url FROM projects WHERE portfolio_id = $1 ORDER BY sort_order",
        [row.id]
      );

      for (const p of projectsResult.rows) {
        jsonLd.subjectOf.push({
          "@type": "CreativeWork",
          name: p.title,
          description: p.description || "",
          url: p.url || `${baseUrl}/p/${row.slug}`,
        });
        jsonLd.knowsAbout.push(p.title);
      }

      res.setHeader("Cache-Control", "public, max-age=3600");
      res.json(jsonLd);
    } catch (err) {
      next(err);
    }
  }
);
