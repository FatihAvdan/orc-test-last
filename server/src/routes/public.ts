import { Router, Request, Response, NextFunction } from "express";
import { Portfolio } from "@devfolio/shared";
import { query } from "../config/db";
import { AppError } from "../middleware/error-handler";

export const publicRouter = Router();

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderPortfolioHtml(portfolio: Portfolio): string {
  const title = escapeHtml(portfolio.seoTitle || portfolio.title);
  const description = escapeHtml(
    portfolio.seoDescription || portfolio.description || ""
  );
  const keywords = escapeHtml(portfolio.seoKeywords || "");
  const ogTitle = title;
  const ogDescription = description;

  const socialLinksHtml = portfolio.socialLinks
    .map(
      (link) =>
        `<a href="${escapeHtml(link.url)}" target="_blank" rel="noopener">${escapeHtml(link.label || link.platform)}</a>`
    )
    .join(" | ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  ${keywords ? `<meta name="keywords" content="${keywords}">` : ""}
  <meta property="og:title" content="${ogTitle}">
  <meta property="og:description" content="${ogDescription}">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${ogTitle}">
  <meta name="twitter:description" content="${ogDescription}">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f8f9fa;
      color: #212529;
      line-height: 1.6;
      min-height: 100vh;
    }
    .container { max-width: 800px; margin: 0 auto; padding: 40px 20px; }
    header { text-align: center; padding: 60px 0 40px; }
    h1 { font-size: 2.5rem; margin-bottom: 12px; }
    .description { font-size: 1.125rem; color: #495057; margin-bottom: 24px; }
    .social-links { margin-top: 24px; }
    .social-links a {
      display: inline-block;
      margin: 0 8px;
      padding: 8px 16px;
      background: #e9ecef;
      border-radius: 6px;
      text-decoration: none;
      color: #212529;
      transition: background 0.2s;
    }
    .social-links a:hover { background: #dee2e6; }
    footer {
      text-align: center;
      padding: 40px 0;
      color: #868e96;
      font-size: 0.875rem;
    }
    .badge {
      display: inline-block;
      padding: 6px 14px;
      background: #d3f9d8;
      color: #2b8a3e;
      border-radius: 20px;
      font-size: 0.875rem;
      font-weight: 500;
      margin-top: 16px;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${title}</h1>
      ${description ? `<p class="description">${description}</p>` : ""}
      <span class="badge">Published Portfolio</span>
    </header>
    ${portfolio.socialLinks.length > 0 ? `<div class="social-links"><h2>Connect</h2><p>${socialLinksHtml}</p></div>` : ""}
    <footer>
      <p>Powered by DevFolio</p>
    </footer>
  </div>
</body>
</html>`;
}

publicRouter.get(
  "/p/:slug",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { slug } = req.params;

      if (!slug) {
        throw new AppError("Slug is required", 400);
      }

      const result = await query(
        `SELECT id, user_id, title, slug, description, template, published,
                social_links, seo_title, seo_description, seo_keywords, custom_domain,
                created_at, updated_at
         FROM portfolios
         WHERE slug = $1 AND published = true`,
        [slug]
      );

      if (result.rows.length === 0) {
        throw new AppError("Portfolio not found", 404);
      }

      const row = result.rows[0];
      const portfolio: Portfolio = {
        id: row.id as string,
        userId: row.user_id as string,
        title: row.title as string,
        slug: row.slug as string,
        description: row.description as string,
        template: row.template as string,
        published: row.published as boolean,
        socialLinks: Array.isArray(row.social_links)
          ? row.social_links
          : typeof row.social_links === "string"
            ? JSON.parse(row.social_links as string)
            : [],
        seoTitle: row.seo_title as string,
        seoDescription: row.seo_description as string,
        seoKeywords: row.seo_keywords as string,
        customDomain: (row.custom_domain as string) || undefined,
        createdAt: (row.created_at as Date).toISOString(),
        updatedAt: (row.updated_at as Date).toISOString(),
      };

      const accept = req.headers.accept || "";
      if (accept.includes("application/json")) {
        res.json({ success: true, data: portfolio });
      } else {
        const html = renderPortfolioHtml(portfolio);
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.send(html);
      }
    } catch (err) {
      next(err);
    }
  }
);
