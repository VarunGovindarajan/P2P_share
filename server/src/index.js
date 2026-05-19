import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import authRoutes from "./routes/auth.js";
import fileRoutes from "./routes/files.js";
import { initSocket } from "./socket/socketServer.js";

dotenv.config();
console.log("PINATA_JWT starts with:", process.env.PINATA_JWT?.slice(0, 20));
console.log("PINATA_GATEWAY:", process.env.PINATA_GATEWAY);
const app = express();
const httpServer = createServer(app);

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    const allowed = [
      "http://localhost:5173",
      "https://p2-p-share.vercel.app",
      process.env.FRONTEND_URL,
    ].filter(Boolean);

    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true,
}));a
app.use(express.json());

// Routes
app.get("/", (req, res) => res.json({ status: "Server is running" }));
app.use("/api/auth", authRoutes);
app.use("/api/files", fileRoutes);

// Socket
initSocket(httpServer);

// DB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err));

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));

export { httpServer };