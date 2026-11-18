import winston from "winston";
import config from "./index.js"

/**
 * Winston logger configuration
 * Provides logging!
 */
const logger = winston.createLogger({
    level: config.node_env === "production" ? 'info' : 'debug',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
    ),

    defaultMeta: { service: "api-monitoring" },

    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: "error" }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
    ],
})

// Enable Console logging in all environments (both development and production)
// so startup logs and exceptions are captured by container environments like Render.
logger.add(new winston.transports.Console({
    format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
            delete meta.service;
            const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
            if (stack) {
                const hasStackInMessage = typeof message === 'string' && message.includes(stack);
                return `${timestamp} [${level}]: ${hasStackInMessage ? message : `${message}\n${stack}`}${metaStr}`;
            }
            return `${timestamp} [${level}]: ${message}${metaStr}`;
        })
    )
}))

export default logger