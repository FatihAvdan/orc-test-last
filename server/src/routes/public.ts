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

function socialIconClass(platform: string): string {
  const normalized = platform.toLowerCase();
  if (normalized.includes("github")) return "icon-github";
  if (normalized.includes("linkedin")) return "icon-linkedin";
  if (normalized.includes("twitter") || normalized.includes("x.com")) return "icon-twitter";
  if (normalized.includes("instagram")) return "icon-instagram";
  if (normalized.includes("youtube")) return "icon-youtube";
  if (normalized.includes("dribbble")) return "icon-dribbble";
  if (normalized.includes("behance")) return "icon-behance";
  if (normalized.includes("medium")) return "icon-medium";
  if (normalized.includes("dev.to")) return "icon-devto";
  if (normalized.includes("stackoverflow")) return "icon-stackoverflow";
  if (normalized.includes("gitlab")) return "icon-gitlab";
  if (normalized.includes("facebook")) return "icon-facebook";
  if (normalized.includes("tiktok")) return "icon-tiktok";
  if (normalized.includes("twitch")) return "icon-twitch";
  if (normalized.includes("discord")) return "icon-discord";
  if (normalized.includes("website") || normalized.includes("personal")) return "icon-globe";
  return "icon-link";
}

function socialIconSvg(className: string): string {
  const icons: Record<string, string> = {
    "icon-github": `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>`,
    "icon-linkedin": `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,
    "icon-twitter": `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
    "icon-instagram": `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>`,
    "icon-youtube": `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
    "icon-globe": `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm7.931 9h-2.764a14.67 14.67 0 00-1.792-6.243A8.013 8.013 0 0119.931 11zM12.53 4.027c1.035 1.364 2.427 3.78 2.627 6.973H9.03c.2-3.192 1.592-5.609 2.627-6.973C11.823 4.009 11.916 4 12 4c.084 0 .177.009.53.027zm-3.842.7C7.704 6.618 7.136 8.762 7.03 11H4.069a8.013 8.013 0 014.619-6.273zM4.069 13h2.974c.136 2.379.665 4.478 1.73 6.273A8.013 8.013 0 014.069 13zm5.79 6.973C8.824 18.609 7.432 16.193 7.232 13h3.897c-.2 3.192-1.592 5.609-2.627 6.973-.353.018-.445.027-.53.027-.084 0-.177-.009-.53-.027zm4.492-.7c.98-1.759 1.524-3.845 1.664-6.273h2.916a8.013 8.013 0 01-4.58 6.273zm1.664-8.273c-.14-2.429-.684-4.514-1.664-6.273a8.013 8.013 0 014.58 6.273h-2.916z"/></svg>`,
    "icon-dribbble": `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 24C5.385 24 0 18.615 0 12S5.385 0 12 0s12 5.385 12 12-5.385 12-12 12zm10.12-10.358c-.35-.11-3.17-.953-6.384-.438 1.34 3.684 1.887 6.684 1.992 7.308 2.3-1.555 3.936-4.02 4.395-6.87zm-6.115 7.808c-.153-.9-.75-4.032-2.19-7.77l-.066.02c-5.79 2.015-7.86 6.025-8.04 6.4 1.73 1.358 3.92 2.166 6.29 2.166 1.42 0 2.77-.29 4-.81zm-11.62-2.58c.232-.4 3.045-5.055 8.332-6.765.135-.045.27-.084.405-.12-.26-.585-.54-1.167-.832-1.74C7.17 11.775 2.206 11.71 1.756 11.7l-.004.312c0 2.633.998 5.037 2.634 6.855zm-2.42-8.955c.46.008 4.683.026 9.477-1.248-1.698-3.018-3.53-5.558-3.8-5.928-2.868 1.35-5.01 3.99-5.676 7.17zM9.6 2.052c.282.38 2.145 2.914 3.822 6 3.645-1.365 5.19-3.44 5.373-3.702-1.81-1.61-4.19-2.586-6.795-2.586-.825 0-1.63.1-2.4.285zm10.335 3.483c-.218.29-1.91 2.493-5.724 4.04.24.49.47.985.68 1.486.08.18.15.36.22.53 3.41-.43 6.8.26 7.14.33-.02-2.42-.88-4.64-2.31-6.38z"/></svg>`,
    "icon-behance": `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 7h-7V5h7v2zm1.726 10c-.442 1.297-2.029 3-5.101 3-3.074 0-5.564-1.729-5.564-5.675 0-3.91 2.325-5.92 5.466-5.92 3.082 0 4.964 1.782 5.375 4.426.078.506.109 1.188.095 2.14H15.97c.13 3.211 3.483 3.312 4.588 2.029h3.168zm-7.686-4h4.965c-.105-1.547-1.136-2.219-2.477-2.219-1.466 0-2.277.768-2.488 2.219zm-9.574 6.988H0V5.021h6.953c5.476.081 5.58 5.444 2.72 6.906 3.461 1.26 3.577 8.061-3.207 8.061zM3 11h3.584c2.508 0 2.906-3-.312-3H3v3zm3.391 3H3v3.016h3.341c3.055 0 2.868-3.016.05-3.016z"/></svg>`,
  };
  return icons[className] || icons["icon-link"];
}

function renderPortfolioHtml(portfolio: Portfolio, portfolioId: string): string {
  const title = escapeHtml(portfolio.seoTitle || portfolio.title);
  const description = escapeHtml(
    portfolio.seoDescription || portfolio.description || ""
  );
  const keywords = escapeHtml(portfolio.seoKeywords || "");
  const ogTitle = title;
  const ogDescription = description;

  const socialLinksHtml = portfolio.socialLinks
    .map((link) => {
      const iconClass = socialIconClass(link.platform);
      const iconSvg = socialIconSvg(iconClass);
      return `<a href="${escapeHtml(link.url)}" target="_blank" rel="noopener" class="social-link ${iconClass}" aria-label="${escapeHtml(link.platform)}">
        <span class="social-icon">${iconSvg}</span>
        <span class="social-label">${escapeHtml(link.label || link.platform)}</span>
      </a>`;
    })
    .join("\n");

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
    h2 { font-size: 1.5rem; margin-bottom: 16px; color: #343a40; }
    .description { font-size: 1.125rem; color: #495057; margin-bottom: 24px; }
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
    section { padding: 32px 0; border-top: 1px solid #dee2e6; }
    .social-links {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      justify-content: center;
      padding: 16px 0;
    }
    .social-link {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      background: #e9ecef;
      border-radius: 8px;
      text-decoration: none;
      color: #212529;
      transition: all 0.2s;
      font-size: 0.95rem;
    }
    .social-link:hover { background: #dee2e6; transform: translateY(-1px); }
    .social-link .social-icon {
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .social-link .social-icon svg { width: 18px; height: 18px; }
    .social-link.icon-github:hover { background: #24292e; color: #fff; }
    .social-link.icon-linkedin:hover { background: #0a66c2; color: #fff; }
    .social-link.icon-twitter:hover { background: #000; color: #fff; }
    .social-link.icon-instagram:hover { background: #e4405f; color: #fff; }
    .social-link.icon-youtube:hover { background: #ff0000; color: #fff; }
    .social-link.icon-dribbble:hover { background: #ea4c89; color: #fff; }
    .social-link.icon-behance:hover { background: #1769ff; color: #fff; }
    .social-link.icon-medium:hover { background: #000; color: #fff; }
    .social-link.icon-devto:hover { background: #000; color: #fff; }
    .social-link.icon-facebook:hover { background: #1877f2; color: #fff; }
    .social-link.icon-tiktok:hover { background: #000; color: #fff; }
    .social-link.icon-twitch:hover { background: #9146ff; color: #fff; }
    .social-link.icon-discord:hover { background: #5865f2; color: #fff; }
    .social-link.icon-gitlab:hover { background: #fc6d26; color: #fff; }
    .social-link.icon-stackoverflow:hover { background: #f48225; color: #fff; }
    .social-link.icon-globe:hover { background: #495057; color: #fff; }
    .contact-form {
      max-width: 500px;
      margin: 0 auto;
      padding: 20px 0;
    }
    .contact-form .form-group {
      margin-bottom: 16px;
    }
    .contact-form label {
      display: block;
      margin-bottom: 4px;
      font-weight: 500;
      color: #495057;
      font-size: 0.9rem;
    }
    .contact-form input,
    .contact-form textarea {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid #ced4da;
      border-radius: 6px;
      font-size: 1rem;
      font-family: inherit;
      transition: border-color 0.2s;
      outline: none;
    }
    .contact-form input:focus,
    .contact-form textarea:focus {
      border-color: #0d6efd;
      box-shadow: 0 0 0 3px rgba(13,110,253,0.15);
    }
    .contact-form textarea {
      min-height: 120px;
      resize: vertical;
    }
    .contact-form button {
      padding: 10px 24px;
      background: #0d6efd;
      color: #fff;
      border: none;
      border-radius: 6px;
      font-size: 1rem;
      cursor: pointer;
      transition: background 0.2s;
      font-weight: 500;
    }
    .contact-form button:hover { background: #0b5ed7; }
    .contact-form button:disabled { background: #6c757d; cursor: not-allowed; }
    .contact-form .message-result {
      margin-top: 12px;
      padding: 10px 16px;
      border-radius: 6px;
      font-size: 0.9rem;
    }
    .contact-form .message-result.success {
      background: #d3f9d8;
      color: #2b8a3e;
    }
    .contact-form .message-result.error {
      background: #ffe3e3;
      color: #c92a2a;
    }
    footer {
      text-align: center;
      padding: 40px 0;
      color: #868e96;
      font-size: 0.875rem;
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
    ${portfolio.socialLinks.length > 0 ? `<section><h2>Connect</h2><div class="social-links">${socialLinksHtml}</div></section>` : ""}
    <section>
      <h2>Get in Touch</h2>
      <form class="contact-form" id="contact-form" onsubmit="return submitContact(event)">
        <div class="form-group">
          <label for="cf-name">Name</label>
          <input type="text" id="cf-name" name="name" required maxlength="255">
        </div>
        <div class="form-group">
          <label for="cf-email">Email</label>
          <input type="email" id="cf-email" name="email" required maxlength="255">
        </div>
        <div class="form-group">
          <label for="cf-message">Message</label>
          <textarea id="cf-message" name="message" required></textarea>
        </div>
        <button type="submit" id="cf-submit">Send Message</button>
        <div id="cf-result" style="display:none"></div>
      </form>
    </section>
    <footer>
      <p>Powered by DevFolio</p>
    </footer>
  </div>
  <script>
    var portfolioId = "${escapeHtml(portfolioId)}";
    var contactEndpoint = "/api/contact";
    var resultEl = document.getElementById("cf-result");
    var submitBtn = document.getElementById("cf-submit");

    function submitContact(e) {
      e.preventDefault();
      submitBtn.disabled = true;
      resultEl.style.display = "none";
      resultEl.className = "message-result";

      var name = document.getElementById("cf-name").value.trim();
      var email = document.getElementById("cf-email").value.trim();
      var message = document.getElementById("cf-message").value.trim();

      fetch(contactEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name, email: email, message: message, portfolioId: portfolioId })
      })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          resultEl.style.display = "block";
          if (data.success) {
            resultEl.className = "message-result success";
            resultEl.textContent = "Message sent successfully!";
            document.getElementById("contact-form").reset();
          } else {
            resultEl.className = "message-result error";
            resultEl.textContent = data.error || "Something went wrong. Please try again.";
          }
        })
        .catch(function() {
          resultEl.style.display = "block";
          resultEl.className = "message-result error";
          resultEl.textContent = "Network error. Please try again.";
        })
        .finally(function() {
          submitBtn.disabled = false;
        });
      return false;
    }
  </script>
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

      const portfolio = await getPortfolioBySlug(slug);

      if (!portfolio) {
        throw new AppError("Portfolio not found", 404);
      }

      servePortfolio(req, res, portfolio);
    } catch (err) {
      next(err);
    }
  }
);

publicRouter.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const host = req.headers.host || "";
      if (!host) {
        next();
        return;
      }

      const domain = host.split(":")[0].toLowerCase();
      if (!domain || domain === "localhost" || domain === "127.0.0.1") {
        next();
        return;
      }

      const result = await query(
        `SELECT id, user_id, title, slug, description, template, published,
                social_links, seo_title, seo_description, seo_keywords, custom_domain,
                created_at, updated_at
         FROM portfolios
         WHERE custom_domain = $1 AND published = true`,
        [domain]
      );

      if (result.rows.length === 0) {
        next();
        return;
      }

      const row = result.rows[0];
      const portfolio = mapRowToPortfolio(row);
      servePortfolio(req, res, portfolio);
    } catch (err) {
      next(err);
    }
  }
);

async function getPortfolioBySlug(slug: string): Promise<Portfolio | null> {
  const result = await query(
    `SELECT id, user_id, title, slug, description, template, published,
            social_links, seo_title, seo_description, seo_keywords, custom_domain,
            created_at, updated_at
     FROM portfolios
     WHERE slug = $1 AND published = true`,
    [slug]
  );

  if (result.rows.length === 0) return null;
  return mapRowToPortfolio(result.rows[0]);
}

function mapRowToPortfolio(row: Record<string, unknown>): Portfolio {
  return {
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
    seoTitle: (row.seo_title as string) || undefined,
    seoDescription: (row.seo_description as string) || undefined,
    seoKeywords: (row.seo_keywords as string) || undefined,
    customDomain: (row.custom_domain as string) || undefined,
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
  };
}

function servePortfolio(
  req: Request,
  res: Response,
  portfolio: Portfolio
): void {
  const accept = req.headers.accept || "";
  if (accept.includes("application/json")) {
    res.json({ success: true, data: portfolio });
  } else {
    const html = renderPortfolioHtml(portfolio, portfolio.id);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  }
}
