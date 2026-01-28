import dotenv from "dotenv";
dotenv.config();

const required = [
    "NODE_ENV",
    "PORT",
    "MONGO_URI",
    "JWT_SECRET",
    "FRONTEND_LINK",
    "FRONTEND_LINK_DEV",
];

for (const key of required) {
    if (!process.env[key]) {
        throw new Error(`Missing required env variable: ${key}`);
    }
}


const getCorsOptions = () => {
    const isProduction = process.env.NODE_ENV === "production";
    const allowedOrigin = isProduction ? process.env.FRONTEND_LINK : process.env.FRONTEND_LINK_DEV;

    return {
        origin: allowedOrigin,
        credentials: true,
        methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
        allowedHeaders: "Content-Type,Authorization",
    };
};


export const env = {
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT,
    mongoUri: process.env.MONGO_URI,
    jwtSecret: process.env.JWT_SECRET,
    // Added the CORS options here
    corsOptions: getCorsOptions(),
};
