import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { healthRouter } from "./routes/health";
import { errorHandler } from "./middleware/error-handler";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use("/api/health", healthRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`DevFolio server running on port ${PORT}`);
});

export default app;
