import { Router, Request, Response, NextFunction } from "express";
import { query } from "../config/db";
import { themeRouter } from "./theme";

export const publicRouter = Router();

publicRouter.get(
  "/p/:slug",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { slug } = req.params;
      const host = req.headers.host || "";

      let result = await query(
        `SELECT p.*, u.name as owner_name, u.email as owner_email
         FROM portfolios p
         INNER JOIN users u ON u.id = p.user_id
         WHERE (p.slug = $1 OR p.custom_domain = $2) AND p.published = true`,
        [slug, host]
      );

      if (result.rows.length === 0) {
        result = await query(
          `SELECT p.*, u.name as owner_name, u.email as owner_email
           FROM portfolios p
           INNER JOIN users u ON u.id = p.user_id
           WHERE p.slug = $1 AND p.published = true`,
          [slug]
        );
      }

      if (result.rows.length === 0) {
        res.status(404).send(render404());
        return;
      }

      const row = result.rows[0];
      const baseUrl = process.env.BASE_URL || `http://${host}`;

      const projects = await query(
        "SELECT * FROM projects WHERE portfolio_id = $1 ORDER BY sort_order",
        [row.id]
      );

      const cv = await query("SELECT * FROM cv_sections WHERE user_id = $1", [row.user_id]);

      const socialLinks = await query(
        "SELECT platform, url, label FROM social_links WHERE user_id = $1 ORDER BY sort_order",
        [row.user_id]
      );

      const template = row.template || "default";
      const themeColors = getThemeColors(row.theme);
      const css = generateCSS(themeColors);

      let projectsHTML = "";
      if (projects.rows.length > 0) {
        projectsHTML = `<section class="section"><h2>Projects</h2><div class="grid">`;
        for (const p of projects.rows) {
          projectsHTML += `<div class="card">
            ${p.image ? `<img src="${p.image}" alt="${p.title}" class="card-img" loading="lazy"/>` : ""}
            <div class="card-body">
              <h3>${p.title}</h3>
              ${p.description ? `<p>${p.description}</p>` : ""}
              ${p.url ? `<a href="${p.url}" target="_blank" rel="noopener" class="btn">View Project</a>` : ""}
            </div>
          </div>`;
        }
        projectsHTML += `</div></section>`;
      }

      let cvHTML = "";
      if (cv.rows.length > 0) {
        const c = cv.rows[0];
        if (c.bio) {
          cvHTML += `<section class="section"><h2>About Me</h2><p class="bio">${c.bio}</p></section>`;
        }
        const skills = typeof c.skills === "string" ? JSON.parse(c.skills) : c.skills;
        if (skills && skills.length > 0) {
          cvHTML += `<section class="section"><h2>Skills</h2><div class="skills">`;
          for (const s of skills) {
            cvHTML += `<div class="skill-item">
              <span class="skill-label">${s.name}</span>
              <div class="skill-bar"><div class="skill-fill" style="width:${s.level}%"></div></div>
            </div>`;
          }
          cvHTML += `</div></section>`;
        }
        const exp = typeof c.experience === "string" ? JSON.parse(c.experience) : c.experience;
        if (exp && exp.length > 0) {
          cvHTML += `<section class="section"><h2>Experience</h2><div class="timeline">`;
          for (const e of exp) {
            cvHTML += `<div class="timeline-item">
              <h3>${e.title}</h3>
              <p class="company">${e.company}</p>
              <p class="dates">${e.startDate} — ${e.endDate || "Present"}</p>
              ${e.description ? `<p>${e.description}</p>` : ""}
            </div>`;
          }
          cvHTML += `</div></section>`;
        }
        const edu = typeof c.education === "string" ? JSON.parse(c.education) : c.education;
        if (edu && edu.length > 0) {
          cvHTML += `<section class="section"><h2>Education</h2><div class="timeline">`;
          for (const e of edu) {
            cvHTML += `<div class="timeline-item">
              <h3>${e.degree} in ${e.field}</h3>
              <p class="company">${e.school}</p>
              <p class="dates">${e.startDate} — ${e.endDate || "Present"}</p>
            </div>`;
          }
          cvHTML += `</div></section>`;
        }
      }

      let socialHTML = "";
      if (socialLinks.rows.length > 0) {
        socialHTML = `<section class="section"><h2>Connect</h2><div class="social-links">`;
        for (const l of socialLinks.rows) {
          const icon = getSocialIcon(l.platform);
          socialHTML += `<a href="${l.url}" target="_blank" rel="noopener" class="social-link" title="${l.platform}">${icon} ${l.label || l.platform}</a>`;
        }
        socialHTML += `</div></section>`;
      }

      let contactHTML = "";
      if (row.email) {
        contactHTML = `<section class="section"><h2>Contact</h2>
          <form id="contact-form" class="contact-form" onsubmit="submitContact(event, '${slug}')">
            <input type="text" name="name" placeholder="Your Name" required minlength="2">
            <input type="email" name="email" placeholder="Your Email" required>
            <input type="text" name="subject" placeholder="Subject" required minlength="3">
            <textarea name="message" placeholder="Your Message" required minlength="10" rows="4"></textarea>
            <button type="submit" class="btn">Send Message</button>
          </form>
          <div id="contact-result"></div>
        </section>`;
      }

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${row.title} — ${row.owner_name}</title>
  <meta name="description" content="${row.description || `Portfolio of ${row.owner_name}`}">
  <meta property="og:title" content="${row.title} — ${row.owner_name}">
  <meta property="og:description" content="${row.description || ""}">
  <meta property="og:url" content="${baseUrl}/p/${slug}">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary">
  <script type="application/ld+json">
    ${getJsonLd(row, projects.rows, baseUrl, slug)}
  </script>
  <link rel="canonical" href="${baseUrl}/p/${slug}">
  <style>${css}</style>
</head>
<body>
  <main class="container">
    <header class="hero">
      <h1>${row.owner_name}</h1>
      <p class="subtitle">${row.title}</p>
      ${row.description ? `<p class="description">${row.description}</p>` : ""}
    </header>
    ${projectsHTML}
    ${cvHTML}
    ${socialHTML}
    ${contactHTML}
  </main>
  <footer><p>&copy; ${new Date().getFullYear()} ${row.owner_name}. Powered by DevFolio.</p></footer>
  <script>
    async function submitContact(e, slug) {
      e.preventDefault();
      const form = e.target;
      const result = document.getElementById('contact-result');
      const btn = form.querySelector('button');
      btn.disabled = true;
      btn.textContent = 'Sending...';
      try {
        const data = {
          name: form.name.value,
          email: form.email.value,
          subject: form.subject.value,
          message: form.message.value,
          portfolioSlug: slug
        };
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const json = await res.json();
        result.innerHTML = json.success
          ? '<p style="color:green">Message sent successfully!</p>'
          : '<p style="color:red">' + (json.error || 'Failed to send message') + '</p>';
        if (json.success) form.reset();
      } catch (err) {
        result.innerHTML = '<p style="color:red">Network error. Please try again.</p>';
      }
      btn.disabled = false;
      btn.textContent = 'Send Message';
    }
  </script>
</body>
</html>`;

      res.setHeader("Cache-Control", "public, max-age=300");
      res.send(html);
    } catch (err) {
      next(err);
    }
  }
);

publicRouter.get(
  "/p/:slug/analytics",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { slug } = req.params;
      const portResult = await query(
        "SELECT id FROM portfolios WHERE slug = $1 AND published = true",
        [slug]
      );
      if (portResult.rows.length === 0) {
        res.status(404).json({ success: false, error: "Not found" });
        return;
      }

      const totalViews = await query(
        "SELECT COUNT(*)::int as count FROM analytics_events WHERE portfolio_id = $1",
        [portResult.rows[0].id]
      );
      res.json({
        success: true,
        data: { totalViews: Number(totalViews.rows[0].count) },
      });
    } catch (err) {
      next(err);
    }
  }
);

function render404(): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>404 - Not Found</title><style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f5f5f5;color:#333}h1{font-size:4rem;margin:0}p{font-size:1.2rem}a{color:#0077B6}</style></head><body><div style="text-align:center"><h1>404</h1><p>Portfolio not found</p><a href="/">Go Home</a></div></body></html>`;
}

function getThemeColors(themeName: string): Record<string, string> {
  const themes: Record<string, Record<string, string>> = {
    ocean: { primary: "#0077B6", secondary: "#00B4D8", bg: "#f0f9ff", text: "#03045E", accent: "#90E0EF", card: "#e0f2fe" },
    forest: { primary: "#2D6A4F", secondary: "#52B788", bg: "#f0fdf4", text: "#081C15", accent: "#95D5B2", card: "#dcfce7" },
    sunset: { primary: "#E85D04", secondary: "#F48C06", bg: "#fff7ed", text: "#6B2100", accent: "#FAA307", card: "#ffedd5" },
    midnight: { primary: "#7B2CBF", secondary: "#9D4EDD", bg: "#0f0020", text: "#E0AAFF", accent: "#C77DFF", card: "#1a0033" },
  };
  return themes[themeName] || themes.ocean;
}

function generateCSS(colors: Record<string, string>): string {
  return `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
           background: ${colors.bg}; color: ${colors.text}; line-height: 1.7; }
    .container { max-width: 900px; margin: 0 auto; padding: 2rem 1.5rem; }
    .hero { text-align: center; padding: 3rem 0 2rem; }
    .hero h1 { font-size: 2.5rem; color: ${colors.primary}; }
    .subtitle { font-size: 1.3rem; color: ${colors.secondary}; margin-top: 0.5rem; }
    .description { max-width: 600px; margin: 1rem auto 0; opacity: 0.85; font-size: 1.05rem; }
    .section { margin: 2.5rem 0; }
    .section h2 { font-size: 1.5rem; color: ${colors.primary}; margin-bottom: 1.25rem;
                  padding-bottom: 0.5rem; border-bottom: 2px solid ${colors.accent}; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1.25rem; }
    .card { background: ${colors.card}; border-radius: 10px; overflow: hidden;
            border: 1px solid ${colors.accent}; transition: transform 0.2s; }
    .card:hover { transform: translateY(-2px); }
    .card-img { width: 100%; height: 180px; object-fit: cover; }
    .card-body { padding: 1.25rem; }
    .card-body h3 { font-size: 1.1rem; color: ${colors.primary}; margin-bottom: 0.5rem; }
    .card-body p { font-size: 0.95rem; opacity: 0.85; margin-bottom: 0.75rem; }
    .btn { display: inline-block; background: ${colors.primary}; color: #fff; padding: 0.5rem 1.25rem;
           border-radius: 6px; text-decoration: none; font-size: 0.9rem; font-weight: 500;
           border: none; cursor: pointer; transition: opacity 0.2s; }
    .btn:hover { opacity: 0.9; }
    .skills { display: flex; flex-direction: column; gap: 1rem; }
    .skill-item { display: flex; flex-direction: column; gap: 0.3rem; }
    .skill-label { font-weight: 500; font-size: 0.95rem; }
    .skill-bar { background: ${colors.accent}40; height: 8px; border-radius: 4px; overflow: hidden; }
    .skill-fill { background: ${colors.primary}; height: 100%; border-radius: 4px; transition: width 0.3s; }
    .timeline { display: flex; flex-direction: column; gap: 1.25rem; }
    .timeline-item { padding-left: 1rem; border-left: 3px solid ${colors.accent}; }
    .timeline-item h3 { color: ${colors.primary}; font-size: 1.1rem; }
    .company { font-weight: 500; color: ${colors.secondary}; }
    .dates { font-size: 0.85rem; opacity: 0.7; margin-bottom: 0.3rem; }
    .social-links { display: flex; gap: 1rem; flex-wrap: wrap; }
    .social-link { display: inline-flex; align-items: center; gap: 0.4rem; color: ${colors.primary};
                   text-decoration: none; padding: 0.5rem 1rem; border: 1px solid ${colors.accent};
                   border-radius: 6px; font-size: 0.9rem; transition: background 0.2s; }
    .social-link:hover { background: ${colors.accent}40; }
    .contact-form { display: flex; flex-direction: column; gap: 0.75rem; max-width: 500px; }
    .contact-form input, .contact-form textarea { padding: 0.7rem 1rem; border: 1px solid ${colors.accent};
      border-radius: 6px; font-size: 0.95rem; font-family: inherit; background: ${colors.card}; color: ${colors.text}; }
    .contact-form input:focus, .contact-form textarea:focus { outline: none; border-color: ${colors.primary}; }
    .bio { font-size: 1.05rem; max-width: 650px; }
    footer { text-align: center; padding: 2rem; font-size: 0.85rem; opacity: 0.6; }
    @media (max-width: 600px) {
      .hero h1 { font-size: 1.8rem; }
      .grid { grid-template-columns: 1fr; }
    }
  `;
}

function getSocialIcon(platform: string): string {
  const icons: Record<string, string> = {
    github: "&#9744;",
    twitter: "&#120143;",
    linkedin: "&#9906;",
    website: "&#127760;",
    email: "&#9993;",
    youtube: "&#9654;",
    instagram: "&#9788;",
    facebook: "&#10070;",
  };
  return icons[platform.toLowerCase()] || "&#128279;";
}

function getJsonLd(row: Record<string, unknown>, projects: unknown[], baseUrl: string, slug: string): string {
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: row.owner_name as string,
    url: `${baseUrl}/p/${slug}`,
    description: row.description as string,
    subjectOf: [] as Record<string, string>[],
  };
  for (const p of projects as Array<Record<string, unknown>>) {
    (ld.subjectOf as Array<Record<string, string>>).push({
      "@type": "CreativeWork",
      name: p.title as string,
      description: (p.description as string) || "",
    });
  }
  return JSON.stringify(ld);
}
