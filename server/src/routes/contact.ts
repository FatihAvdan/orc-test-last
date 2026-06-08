import { Router, Request, Response, NextFunction } from "express";
import nodemailer from "nodemailer";
import { ContactRequest } from "@devfolio/shared";
import { query } from "../config/db";
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

contactRouter.post(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, message, portfolioId }: ContactRequest = req.body;

      if (!name || !email || !message || !portfolioId) {
        throw new AppError(
          "Name, email, message, and portfolioId are required",
          400
        );
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new AppError("Invalid email address", 400);
      }

      const portfolio = await query(
        "SELECT id, user_id, title FROM portfolios WHERE id = $1",
        [portfolioId]
      );

      if (portfolio.rows.length === 0) {
        throw new AppError("Portfolio not found", 404);
      }

      await query(
        `INSERT INTO contact_submissions (portfolio_id, name, email, message)
         VALUES ($1, $2, $3, $4)`,
        [portfolioId, name, email, message]
      );

      const transport = createTransport();
      if (transport) {
        const ownerResult = await query(
          "SELECT email, name FROM users WHERE id = $1",
          [portfolio.rows[0].user_id]
        );

        if (ownerResult.rows.length > 0) {
          const ownerEmail = ownerResult.rows[0].email;
          const portfolioTitle = portfolio.rows[0].title;

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
