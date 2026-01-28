import e from "express"

export const app = e();

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