import { Request, Response, NextFunction } from "express";
import { logger } from "../config/logger";

export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const { method, originalUrl } = req;
    const { statusCode } = res;

    logger.info("request", {
      method,
      url: originalUrl,
      status: statusCode,
      duration: `${duration}ms`,
    });
  });

  next();
}
