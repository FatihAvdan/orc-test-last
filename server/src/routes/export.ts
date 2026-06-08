import { Router, Request, Response, NextFunction } from "express";
import { query } from "../config/db";
import { authMiddleware } from "../middleware/auth";
import { AppError } from "../middleware/error-handler";

export const exportRouter = Router();

exportRouter.use(authMiddleware);

exportRouter.get(
  "/portfolio/:slug",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { slug } = req.params;
      const includeProjects = req.query.includeProjects === "true";
      const includeCV = req.query.includeCV === "true";
      const theme = (req.query.theme as string) || "light";

      const result = await query(
        `SELECT p.*, u.name as owner_name, u.email as owner_email
         FROM portfolios p
         INNER JOIN users u ON u.id = p.user_id
         WHERE p.slug = $1 AND p.user_id = $2`,
        [slug, userId]
      );

      if (result.rows.length === 0) {
        throw new AppError("Portfolio not found", 404);
      }

      const row = result.rows[0];
      const bg = theme === "dark" ? "#1a1a2e" : "#ffffff";
      const text = theme === "dark" ? "#e0e0e0" : "#333333";

      let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${row.title} - Portfolio</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
           max-width: 800px; margin: 0 auto; padding: 2rem;
           background: ${bg}; color: ${text}; line-height: 1.6; }
    h1 { font-size: 2rem; margin-bottom: 0.5rem; }
    .description { font-size: 1.1rem; opacity: 0.8; margin-bottom: 2rem; }
    .section { margin-bottom: 2rem; }
    .section h2 { border-bottom: 2px solid; padding-bottom: 0.5rem; }
    .project { margin-bottom: 1.5rem; padding: 1rem; border: 1px solid; border-radius: 8px; }
    .project h3 { margin: 0 0 0.5rem; }
    .social-links { display: flex; gap: 1rem; flex-wrap: wrap; }
    .social-links a { color: inherit; }
    .skill-bar { background: rgba(128,128,128,0.2); height: 8px; border-radius: 4px; margin: 0.5rem 0; }
    .skill-fill { background: #0077B6; height: 100%; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>${row.owner_name}</h1>
  <p class="description">${row.description || "Portfolio"}</p>
`;

      if (includeProjects) {
        const projects = await query(
          "SELECT * FROM projects WHERE portfolio_id = $1 ORDER BY sort_order",
          [row.id]
        );
        if (projects.rows.length > 0) {
          html += `<div class="section"><h2>Projects</h2>`;
          for (const p of projects.rows) {
            html += `<div class="project">
              <h3>${p.title}</h3>
              ${p.description ? `<p>${p.description}</p>` : ""}
              ${p.url ? `<a href="${p.url}">View Project</a>` : ""}
            </div>`;
          }
          html += `</div>`;
        }
      }

      if (includeCV) {
        const cv = await query("SELECT * FROM cv_sections WHERE user_id = $1", [row.user_id]);
        if (cv.rows.length > 0) {
          const c = cv.rows[0];
          if (c.bio) {
            html += `<div class="section"><h2>About</h2><p>${c.bio}</p></div>`;
          }

          const skills = typeof c.skills === "string" ? JSON.parse(c.skills) : c.skills;
          if (skills && skills.length > 0) {
            html += `<div class="section"><h2>Skills</h2>`;
            for (const s of skills) {
              html += `<div><strong>${s.name}</strong> — ${s.level}%</div>
                <div class="skill-bar"><div class="skill-fill" style="width:${s.level}%"></div></div>`;
            }
            html += `</div>`;
          }

          const exp = typeof c.experience === "string" ? JSON.parse(c.experience) : c.experience;
          if (exp && exp.length > 0) {
            html += `<div class="section"><h2>Experience</h2>`;
            for (const e of exp) {
              html += `<div class="project"><h3>${e.title} at ${e.company}</h3>
                <p>${e.startDate} — ${e.endDate || "Present"}</p>
                ${e.description ? `<p>${e.description}</p>` : ""}</div>`;
            }
            html += `</div>`;
          }

          const edu = typeof c.education === "string" ? JSON.parse(c.education) : c.education;
          if (edu && edu.length > 0) {
            html += `<div class="section"><h2>Education</h2>`;
            for (const e of edu) {
              html += `<div class="project"><h3>${e.degree} in ${e.field}</h3>
                <p>${e.school} — ${e.startDate} to ${e.endDate || "Present"}</p></div>`;
            }
            html += `</div>`;
          }
        }
      }

      const socialLinks = await query(
        "SELECT platform, url, label FROM social_links WHERE user_id = $1 ORDER BY sort_order",
        [row.user_id]
      );
      if (socialLinks.rows.length > 0) {
        html += `<div class="section"><h2>Links</h2><div class="social-links">`;
        for (const l of socialLinks.rows) {
          html += `<a href="${l.url}">${l.label || l.platform}</a>`;
        }
        html += `</div></div>`;
      }

      html += `</body></html>`;

      const filename = `${row.slug || "portfolio"}-export.html`;
      res.setHeader("Content-Type", "text/html");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(html);
    } catch (err) {
      next(err);
    }
  }
);
