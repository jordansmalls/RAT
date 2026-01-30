import { app } from "./app.js";
import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";

const start = async () => {
    await connectDB();
    app.listen(env.port, () => {
        console.log(`server is live on port ${env.port}`);
    });
};

start();
