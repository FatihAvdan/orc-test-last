import { Request, Response, NextFunction } from "express";
import { ApiResponse } from "@devfolio/shared";

export class AppError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = err.message || "Internal Server Error";

  console.error(`[Error] ${statusCode}: ${message}`);

  const response: ApiResponse = {
    success: false,
    error: message,
  };

  res.status(statusCode).json(response);
}
