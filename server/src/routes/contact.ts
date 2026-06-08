import { Router, Request, Response, NextFunction } from "express";
import nodemailer from "nodemailer";
import { ContactRequest, ContactSubmission } from "@devfolio/shared";
import { query } from "../config/db";
import { authMiddleware } from "../middleware/auth";
import { AppError } from "../middleware/error-handler";

export const contactRouter = Router();

function createTransport() {
  if (
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER
  ) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS || "",
      },
    });
  }
  return null;
}

function mapSubmission(row: Record<string, unknown>): ContactSubmission {
  return {
    id: row.id as string,
    portfolioId: row.portfolio_id as string,
    name: row.name as string,
    email: row.email as string,
    message: row.message as string,
    createdAt: (row.created_at as Date).toISOString(),
  };
}

async function resolvePortfolio(portfolioId?: string, slug?: string) {
  if (portfolioId) {
    const result = await query(
      "SELECT id, user_id, title FROM portfolios WHERE id = $1",
      [portfolioId]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  }
  if (slug) {
    const result = await query(
      "SELECT id, user_id, title FROM portfolios WHERE slug = $1",
      [slug]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  }
  return null;
}

contactRouter.post(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, message, portfolioId, slug }: ContactRequest & { slug?: string } = req.body;

      if (!name || !email || !message) {
        throw new AppError(
          "Name, email, and message are required",
          400
        );
      }

      if (!portfolioId && !slug) {
        throw new AppError(
          "portfolioId or slug is required",
          400
        );
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new AppError("Invalid email address", 400);
      }

      const portfolio = await resolvePortfolio(portfolioId, slug);

      if (!portfolio) {
        throw new AppError("Portfolio not found", 404);
      }

      const resolvedId = portfolio.id as string;

      await query(
        `INSERT INTO contact_submissions (portfolio_id, name, email, message)
         VALUES ($1, $2, $3, $4)`,
        [resolvedId, name, email, message]
      );

      const transport = createTransport();
      if (transport) {
        const ownerResult = await query(
          "SELECT email, name FROM users WHERE id = $1",
          [portfolio.user_id]
        );

        if (ownerResult.rows.length > 0) {
          const ownerEmail = ownerResult.rows[0].email;
          const portfolioTitle = portfolio.title;

          await transport.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: ownerEmail,
            subject: `New contact message from ${name} via DevFolio`,
            html: `
              <h2>New Contact Message</h2>
              <p><strong>Portfolio:</strong> ${portfolioTitle}</p>
              <p><strong>From:</strong> ${name} (${email})</p>
              <p><strong>Message:</strong></p>
              <p>${message}</p>
            `,
          });
        }
      }

      res.json({ success: true, data: { sent: true } });
    } catch (err) {
      next(err);
    }
  }
);

contactRouter.get(
  "/portfolio/:portfolioId",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { portfolioId } = req.params;

      const portfolio = await query(
        "SELECT id FROM portfolios WHERE id = $1 AND user_id = $2",
        [portfolioId, userId]
      );

      if (portfolio.rows.length === 0) {
        throw new AppError("Portfolio not found", 404);
      }

      const result = await query(
        `SELECT id, portfolio_id, name, email, message, created_at
         FROM contact_submissions
         WHERE portfolio_id = $1
         ORDER BY created_at DESC`,
        [portfolioId]
      );

      const submissions: ContactSubmission[] = result.rows.map(mapSubmission);
      res.json({ success: true, data: submissions });
    } catch (err) {
      next(err);
    }
  }
);
