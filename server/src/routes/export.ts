import { Router, Request, Response, NextFunction } from "express";
import { Portfolio, SocialLink, ExportedPortfolio } from "@devfolio/shared";
import { query } from "../config/db";
import { authMiddleware } from "../middleware/auth";
import { AppError } from "../middleware/error-handler";

export const exportRouter = Router();

exportRouter.use(authMiddleware);

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderSocialLinks(links: SocialLink[]): string {
  if (!links || links.length === 0) return "";
  return links
    .map(
      (link) =>
        `<a href="${escapeHtml(link.url)}" target="_blank" rel="noopener" class="social-link">
          <span class="social-icon">${escapeHtml(link.platform)}</span>
          ${link.label ? `<span class="social-label">${escapeHtml(link.label)}</span>` : ""}
        </a>`
    )
    .join("\n");
}

function buildExportHtml(
  portfolio: Portfolio,
  customTemplate?: string
): string {
  if (customTemplate) {
    return customTemplate
      .replace(/\{\{title\}\}/g, escapeHtml(portfolio.title))
      .replace(/\{\{description\}\}/g, escapeHtml(portfolio.description))
      .replace(
        /\{\{socialLinks\}\}/g,
        portfolio.socialLinks
          .map((l) => `<a href="${escapeHtml(l.url)}">${escapeHtml(l.platform)}</a>`)
          .join(", ")
      )
      .replace(/\{\{name\}\}/g, escapeHtml(portfolio.title))
      .replace(/\{\{seoTitle\}\}/g, escapeHtml(portfolio.seoTitle || portfolio.title))
      .replace(
        /\{\{seoDescription\}\}/g,
        escapeHtml(portfolio.seoDescription || portfolio.description)
      )
      .replace(
        /\{\{seoKeywords\}\}/g,
        escapeHtml(portfolio.seoKeywords || "")
      );
  }

  const title = escapeHtml(portfolio.title);
  const description = escapeHtml(portfolio.description);
  const socialLinksHtml = renderSocialLinks(portfolio.socialLinks);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Portfolio</title>
  <meta name="description" content="${description}">
  ${portfolio.seoKeywords ? `<meta name="keywords" content="${escapeHtml(portfolio.seoKeywords)}">` : ""}
  <meta property="og:title" content="${escapeHtml(portfolio.seoTitle || portfolio.title)}">
  <meta property="og:description" content="${escapeHtml(portfolio.seoDescription || portfolio.description)}">
  <meta property="og:type" content="website">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #212529; background: #f8f9fa; }
    .wrapper { max-width: 900px; margin: 0 auto; padding: 40px 20px; }
    .hero { text-align: center; padding: 80px 0 40px; }
    .hero h1 { font-size: 3rem; font-weight: 700; margin-bottom: 16px; }
    .hero p { font-size: 1.25rem; color: #495057; max-width: 600px; margin: 0 auto; }
    .section { padding: 40px 0; }
    .section h2 { font-size: 1.75rem; margin-bottom: 16px; }
    .social-links { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; padding: 20px 0; }
    .social-link { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; background: #e9ecef; border-radius: 8px; text-decoration: none; color: #212529; transition: background 0.2s; }
    .social-link:hover { background: #dee2e6; }
    footer { text-align: center; padding: 40px 0; color: #868e96; border-top: 1px solid #dee2e6; margin-top: 60px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <section class="hero">
      <h1>${title}</h1>
      ${description ? `<p>${description}</p>` : ""}
    </section>
    ${portfolio.socialLinks.length > 0 ? `<section class="section"><h2>Connect</h2><div class="social-links">${socialLinksHtml}</div></section>` : ""}
    <footer>
      <p>Built with DevFolio</p>
    </footer>
  </div>
</body>
</html>`;
}

exportRouter.get(
  "/:id/export",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const result = await query(
        `SELECT id, user_id, title, slug, description, template, published,
                social_links, seo_title, seo_description, seo_keywords, custom_domain,
                created_at, updated_at
         FROM portfolios
         WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );

      if (result.rows.length === 0) {
        throw new AppError("Portfolio not found", 404);
      }

      const row = result.rows[0];
      const portfolio: Portfolio = {
        id: row.id as string,
        userId: row.user_id as string,
        title: row.title as string,
        slug: (row.slug as string) || "",
        description: row.description as string,
        template: row.template as string,
        published: row.published as boolean,
        socialLinks: Array.isArray(row.social_links)
          ? row.social_links
          : typeof row.social_links === "string"
            ? JSON.parse(row.social_links as string)
            : [],
        seoTitle: (row.seo_title as string) || undefined,
        seoDescription: (row.seo_description as string) || undefined,
        seoKeywords: (row.seo_keywords as string) || undefined,
        customDomain: (row.custom_domain as string) || undefined,
        createdAt: (row.created_at as Date).toISOString(),
        updatedAt: (row.updated_at as Date).toISOString(),
      };

      const html = buildExportHtml(portfolio);
      const exported: ExportedPortfolio = { html, portfolio };

      res.json({ success: true, data: exported });
    } catch (err) {
      next(err);
    }
  }
);

exportRouter.post(
  "/:id/export",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const { template } = req.body;

      const result = await query(
        `SELECT id, user_id, title, slug, description, template, published,
                social_links, seo_title, seo_description, seo_keywords, custom_domain,
                created_at, updated_at
         FROM portfolios
         WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );

      if (result.rows.length === 0) {
        throw new AppError("Portfolio not found", 404);
      }

      const row = result.rows[0];
      const portfolio: Portfolio = {
        id: row.id as string,
        userId: row.user_id as string,
        title: row.title as string,
        slug: (row.slug as string) || "",
        description: row.description as string,
        template: row.template as string,
        published: row.published as boolean,
        socialLinks: Array.isArray(row.social_links)
          ? row.social_links
          : typeof row.social_links === "string"
            ? JSON.parse(row.social_links as string)
            : [],
        seoTitle: (row.seo_title as string) || undefined,
        seoDescription: (row.seo_description as string) || undefined,
        seoKeywords: (row.seo_keywords as string) || undefined,
        customDomain: (row.custom_domain as string) || undefined,
        createdAt: (row.created_at as Date).toISOString(),
        updatedAt: (row.updated_at as Date).toISOString(),
      };

      const html = buildExportHtml(portfolio, template);

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${portfolio.slug || portfolio.id}.html"`
      );
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(html);
    } catch (err) {
      next(err);
    }
  }
);
