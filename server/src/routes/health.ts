import { Router, Request, Response, NextFunction } from "express";
import { HealthStatus } from "@devfolio/shared";
import { checkDatabaseConnection } from "../config/db";
import { checkRedisConnection } from "../config/redis";

export const healthRouter = Router();

healthRouter.get(
  "/",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const [dbConnected, redisConnected] = await Promise.all([
        checkDatabaseConnection(),
        checkRedisConnection(),
      ]);

      const allServicesUp = dbConnected && redisConnected;

      const health: HealthStatus = {
        status: allServicesUp ? "ok" : "degraded",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        services: {
          database: dbConnected ? "connected" : "disconnected",
          redis: redisConnected ? "connected" : "disconnected",
        },
      };

      const statusCode = allServicesUp ? 200 : 503;
      res.status(statusCode).json(health);
    } catch (err) {
      next(err);
    }
  }
);
