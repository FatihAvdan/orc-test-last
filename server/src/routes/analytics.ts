import { Router, Request, Response, NextFunction } from "express";
import { AnalyticsSummary, ChartDataPoint, PageCount, ReferrerCount } from "@devfolio/shared";
import { query } from "../config/db";
import { authMiddleware } from "../middleware/auth";
import { AppError } from "../middleware/error-handler";

export const analyticsRouter = Router();

analyticsRouter.use(authMiddleware);

analyticsRouter.get(
  "/summary",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const totalResult = await query("SELECT COUNT(*)::int as count FROM analytics_events");
      const totalViews = Number(totalResult.rows[0].count);

      const uniqueResult = await query(
        "SELECT COUNT(DISTINCT visitor_hash)::int as count FROM analytics_events"
      );
      const uniqueVisitors = Number(uniqueResult.rows[0].count);

      const topPageResult = await query(
        `SELECT path, COUNT(*)::int as count FROM analytics_events
         GROUP BY path ORDER BY count DESC LIMIT 1`
      );
      const topPage = topPageResult.rows[0]?.path || "/";

      const todayResult = await query(
        `SELECT COUNT(*)::int as count FROM analytics_events
         WHERE created_at >= CURRENT_DATE`
      );
      const todayViews = Number(todayResult.rows[0].count);

      const summary: AnalyticsSummary = {
        totalViews,
        uniqueVisitors,
        topPage,
        todayViews,
      };

      res.json({ success: true, data: summary });
    } catch (err) {
      next(err);
    }
  }
);

analyticsRouter.get(
  "/pageviews",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 365);
      const result = await query(
        `SELECT TO_CHAR(d.date, 'YYYY-MM-DD') as date, COALESCE(COUNT(e.id), 0)::int as count
         FROM generate_series(CURRENT_DATE - $1::int + 1, CURRENT_DATE, '1 day'::interval) d(date)
         LEFT JOIN analytics_events e ON DATE(e.created_at) = d.date
         GROUP BY d.date ORDER BY d.date`,
        [days]
      );
      const data: ChartDataPoint[] = result.rows.map((r) => ({
        date: r.date,
        count: Number(r.count),
      }));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

analyticsRouter.get(
  "/toppages",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 365);
      const result = await query(
        `SELECT path, COUNT(*)::int as count FROM analytics_events
         WHERE created_at >= CURRENT_DATE - $1::int
         GROUP BY path ORDER BY count DESC LIMIT 10`,
        [days]
      );
      const data: PageCount[] = result.rows.map((r) => ({
        path: r.path,
        count: Number(r.count),
      }));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

analyticsRouter.get(
  "/referrers",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 365);
      const result = await query(
        `SELECT COALESCE(NULLIF(referrer, ''), '(direct)') as referrer, COUNT(*)::int as count
         FROM analytics_events
         WHERE created_at >= CURRENT_DATE - $1::int
         GROUP BY referrer ORDER BY count DESC LIMIT 10`,
        [days]
      );
      const data: ReferrerCount[] = result.rows.map((r) => ({
        referrer: r.referrer,
        count: Number(r.count),
      }));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

analyticsRouter.get(
  "/visitors",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 365);
      const result = await query(
        `SELECT TO_CHAR(d.date, 'YYYY-MM-DD') as date,
                COALESCE(COUNT(DISTINCT e.visitor_hash), 0)::int as count
         FROM generate_series(CURRENT_DATE - $1::int + 1, CURRENT_DATE, '1 day'::interval) d(date)
         LEFT JOIN analytics_events e ON DATE(e.created_at) = d.date
         GROUP BY d.date ORDER BY d.date`,
        [days]
      );
      const data: ChartDataPoint[] = result.rows.map((r) => ({
        date: r.date,
        count: Number(r.count),
      }));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);
