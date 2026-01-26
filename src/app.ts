/**
 * Main Application (TypeScript)
 */

import express, { Request, Response } from "express";
import swaggerUi from "swagger-ui-express";
import routes from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { swaggerSpec } from "./config/swagger.js";

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// Swagger Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API Info Route
app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "Welcome to DefenseFlow API",
    documentation: "/api-docs",
  });
});

// Routes
app.use("/api", routes);

// Error handling
app.use(errorHandler);

export default app;
