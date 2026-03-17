import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/auth.routes.js";
import locationRoutes from "./routes/location.routes.js";
import issueRoutes from "./routes/issue.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import ownerRoutes from "./routes/owner.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import { getJwtSecret } from "./utils/auth.js";

dotenv.config();
getJwtSecret();

const app = express();
const configuredOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000,http://127.0.0.1:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.set("trust proxy", 1);

app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || configuredOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Origin not allowed by CORS"));
  },
  credentials: true,
}));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads", {
  fallthrough: false,
  maxAge: "1d",
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);
app.use("/api/auth", authRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/issues", issueRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/owner", ownerRoutes);
app.use("/api/upload", uploadRoutes);

app.get("/api/health", (_, res) => {
  res.json({ ok: true, message: "Civic Voice API healthy" });
});

app.use((err, _req, res, _next) => {
  try { console.error(err); } catch { console.error(String(err?.message ?? err)); }

  if (err?.status === 429) {
    return res.status(429).json({ message: "Too many requests" });
  }

  if (err?.name === "MulterError") {
    return res.status(400).json({ message: "Only JPEG, PNG, and WebP images up to 5 MB are allowed." });
  }

  if (err?.message === "Origin not allowed by CORS") {
    return res.status(403).json({ message: "Origin not allowed" });
  }

  res.status(err.status || 500).json({
    message: err.status && err.status < 500 ? err.message : "Internal server error",
  });
});

export default app;
