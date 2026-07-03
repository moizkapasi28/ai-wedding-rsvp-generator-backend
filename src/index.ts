import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { authRouter } from "./routes/auth.routes";
import { connectDB } from "./lib/prisma";
import { errorHandler } from "./middlewares/error.middleware";
import { requestLogger } from "./middlewares/logger.middleware";

const app = express();
const PORT = process.env.PORT;

app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(requestLogger);

app.use("/api/auth", authRouter);

app.use(errorHandler);

async function startServer() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on PORT: ${PORT}`);
  });
}

startServer();
