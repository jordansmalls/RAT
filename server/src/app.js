import express from "express";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import requestIp from "request-ip";

import projectRoutes from "./routes/project.routes.js";
import campaignRoutes from "./routes/campaign.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import redirect from "./routes/redirect.route.js";

export const app = express();

app.use(express.json());
app.use(logger);
app.use(requestIp.mw());

app.use("/api/projects", projectRoutes);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/", redirect);

// app.get("/", (req, res) => res.redirect(env.frontendLink));
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
