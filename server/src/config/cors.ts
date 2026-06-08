import { CorsOptions } from "cors";

const allowedOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";

export const corsConfig: CorsOptions = {
  origin: allowedOrigin,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  maxAge: 86400,
};
