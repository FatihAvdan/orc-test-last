import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { healthRouter } from "./routes/health";
import { errorHandler } from "./middleware/error-handler";
import { requestLogger } from "./middleware/request-logger";
import { logger } from "./config/logger";
import { corsConfig } from "./config/cors";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors(corsConfig));
app.use(express.json());
app.use(requestLogger);

app.use("/api/health", healthRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`DevFolio server running on port ${PORT}`);
});

export default app;
