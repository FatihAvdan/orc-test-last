import { Request, Response, NextFunction } from "express";
import { query } from "../config/db";
import crypto from "crypto";

function getDeviceType(ua: string): string {
  if (/mobile/i.test(ua)) return "mobile";
  if (/tablet|ipad/i.test(ua)) return "tablet";
  return "desktop";
}

function getBrowser(ua: string): string {
  if (/edg/i.test(ua)) return "Edge";
  if (/firefox/i.test(ua)) return "Firefox";
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) return "Safari";
  if (/chrome/i.test(ua)) return "Chrome";
  return "Other";
}

function hashVisitor(ip: string, ua: string): string {
  return crypto.createHash("sha256").update(`${ip}|${ua}`).digest("hex").slice(0, 16);
}

export function analyticsTracking(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  try {
    const userAgent = req.headers["user-agent"] || "";
    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "";
    const referrer = (req.headers.referer || req.headers.referrer || "") as string;
    const path = req.originalUrl || req.path;
    const deviceType = getDeviceType(userAgent);
    const browser = getBrowser(userAgent);
    const visitorHash = hashVisitor(ip, userAgent);

    query(
      `INSERT INTO analytics_events (path, referrer, user_agent, ip_address, event_type, device_type, browser, visitor_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [path, referrer, userAgent, ip, "pageview", deviceType, browser, visitorHash]
    ).catch(() => {});
  } catch {
    // fire and forget
  }

  next();
}
