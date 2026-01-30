import morgan from "morgan";
import { env } from "./env.js";

export const logger = env.nodeEnv === "development" ? morgan("dev") : morgan("combined");
