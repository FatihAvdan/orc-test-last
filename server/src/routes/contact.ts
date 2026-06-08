import { Router, Request, Response, NextFunction } from "express";
import { query } from "../config/db";
import { AppError } from "../middleware/error-handler";

export const contactRouter = Router();

contactRouter.post(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, subject, message, portfolioSlug } = req.body;

      const errors: string[] = [];
      if (!name || typeof name !== "string" || name.trim().length < 2) {
        errors.push("Name is required (min 2 chars)");
      }
      if (
        !email ||
        typeof email !== "string" ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      ) {
        errors.push("Valid email is required");
      }
      if (!subject || typeof subject !== "string" || subject.trim().length < 3) {
        errors.push("Subject is required (min 3 chars)");
      }
      if (!message || typeof message !== "string" || message.trim().length < 10) {
        errors.push("Message is required (min 10 chars)");
      }

      if (errors.length > 0) {
        throw new AppError(errors.join("; "), 400);
      }

      await query(
        `INSERT INTO contact_messages (name, email, subject, message, portfolio_slug)
         VALUES ($1, $2, $3, $4, $5)`,
        [name.trim(), email.trim(), subject.trim(), message.trim(), portfolioSlug || null]
      );

      res.json({ success: true, data: { sent: true } });
    } catch (err) {
      next(err);
    }
  }
);
