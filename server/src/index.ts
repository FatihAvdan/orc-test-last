import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { healthRouter } from "./routes/health";
import { authRouter } from "./routes/auth";
import { portfolioRouter } from "./routes/portfolio";
import { themeRouter, seedPresetThemes } from "./routes/theme";
import { publicRouter } from "./routes/public";
import { contactRouter } from "./routes/contact";
import { exportRouter } from "./routes/export";
import { errorHandler } from "./middleware/error-handler";
import { runMigrations } from "./db/migrate";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/portfolios", portfolioRouter);
app.use("/api/portfolios", exportRouter);
app.use("/api/themes", themeRouter);
app.use("/api/contact", contactRouter);
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
