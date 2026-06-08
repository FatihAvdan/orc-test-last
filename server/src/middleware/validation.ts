import { Request, Response, NextFunction } from "express";
import { AppError } from "./error-handler";

interface ValidationRule {
  field: string;
  validate: (value: unknown) => boolean;
  message: string;
}

export function validate(rules: ValidationRule[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const errors: string[] = [];

    for (const rule of rules) {
      const value = req.body[rule.field];
      if (!rule.validate(value)) {
        errors.push(rule.message);
      }
    }

    if (errors.length > 0) {
      throw new AppError(errors.join("; "), 400);
    }

    next();
  };
}
