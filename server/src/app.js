import e from "express";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";

import projectRoutes from "./routes/project.routes.js";

export const app = e();

app.use(e.json());
app.use(logger);

app.use("/api/projects", projectRoutes);

app.get("/", (req, res) => res.redirect("https://twitter.com/@jsmallsdev"));

app.get("/server/health", (req, res) => {
    res.json({
        status: 200,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version,
    });
});
