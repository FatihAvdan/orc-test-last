import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { healthRouter } from "./routes/health";
import { authRouter } from "./routes/auth";
import { portfolioRouter } from "./routes/portfolio";
import { themeRouter, seedPresetThemes } from "./routes/theme";
import { analyticsRouter } from "./routes/analytics";
import { blogRouter } from "./routes/blog";
import { seoRouter } from "./routes/seo";
import { exportRouter } from "./routes/export";
import { contactRouter } from "./routes/contact";
import { socialRouter } from "./routes/social";
import { analyticsTracking } from "./middleware/analytics";
import { errorHandler } from "./middleware/error-handler";
import { runMigrations } from "./db/migrate";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.set("trust proxy", 1);
app.use(cors());
app.use(express.json());
app.use(analyticsTracking);

app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/portfolios", portfolioRouter);
app.use("/api/themes", themeRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/blog", blogRouter);
app.use("/api/contact", contactRouter);
app.use("/api/social", socialRouter);
app.use("/api/export", exportRouter);
app.use("/api", seoRouter);

import { publicRouter } from "./routes/public";
app.use("/", publicRouter);

app.use(errorHandler);

async function start() {
  try {
    await runMigrations();
    await seedPresetThemes();
    app.listen(PORT, () => {
      console.log(`DevFolio server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

start();

export default app;
