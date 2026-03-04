import express, { Application, Request, Response } from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import routes from "./routes/index.js";
import authRoutes from "./routes/authRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { authenticate } from "./middleware/auth.js";
import { swaggerSpec } from "./config/swagger.js";

const app: Application = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// Swagger Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API Info Route
app.get("/", (_req: Request, res: Response) => {
  res.json({
    message: "Welcome to DefenseFlow API",
    documentation: "/api-docs",
  });
});

// Public routes (no token required)
app.use("/api/auth", authRoutes);

// Protected routes (requires valid JWT)
app.use("/api", authenticate, routes);

// Error handling
app.use(errorHandler);

export default app;

