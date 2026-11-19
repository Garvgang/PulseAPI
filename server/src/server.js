import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import config from './shared/config/index.js';
import logger from './shared/config/logger.js';
import mongodb from './shared/config/mongodb.js';
import postgres from './shared/config/postgres.js';
import rabbitmq from './shared/config/rabbitmq.js';
import errorHandler from './shared/middlewares/errorHandler.js';
import ResponseFormatter from './shared/utils/responseFormatter.js';
import cookieParser from "cookie-parser"

// Routers
import authRouter from "./services/auth/routes/authRouter.js";
import clientRouter from './services/client/routes/clientRoutes.js';
import ingestRouter from "./services/ingest/routes/ingestRoutes.js"
import analyticsRouter from "./services/analytics/routes/analyticsRoutes.js"
import consumer, { startConsumerWithRetry } from './services/processor/consumer.js';

/**
 * Initialize Express app
 */
const app = express();

/**
 * Middlewares
 */
app.use(helmet());
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(cookieParser())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Request logging middleware
 * Logs the HTTP method, path, IP address, and user agent for each incoming request.
 */
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.headers['user-agent']
    });
    next()
})

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
    res.status(200).json(
        ResponseFormatter.success(
            {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
            },
            'Service is healthy'
        )
    );
});

/**
 * Root endpoint
 * Provides basic information about the API service and available endpoints.
 */
app.get("/", (req, res) => {
    res.status(200).json(
        ResponseFormatter.success(
            {
                service: 'API Hit Monitoring System',
                version: '1.0.0',
                endpoints: {
                    health: '/health',
                    auth: '/api/auth',
                    ingest: '/api/hit',
                    analytics: '/api/analytics',
                },
            },
            'API Hit Monitoring Service'
        )
    )
});

/**
 * API Routes
 */
app.use("/api/auth", authRouter);
app.use("/api/hit", ingestRouter);
app.use("/api/analytics", analyticsRouter)
app.use("/api", clientRouter)

/**
 * 404 Handler
 */
app.use((req, res) => {
    res.status(404).json(ResponseFormatter.error("Endpoint not found", 404))
})

app.use(errorHandler)

/**
 * Initialize database connections and start the server
 */
async function initializeConnection() {
    logger.info("Initializing database connections...");

    // 1. MongoDB
    try {
        logger.info("Connecting to MongoDB...");
        await mongodb.connect();
        logger.info("MongoDB connected successfully");
    } catch (error) {
        logger.error("Failed to connect to MongoDB:", error);
        throw error;
    }

    // 2. PostgreSQL
    try {
        logger.info("Connecting to PostgreSQL...");
        await postgres.testConnection();
        logger.info("PostgreSQL connected successfully");
    } catch (error) {
        logger.error("Failed to connect to PostgreSQL:", error);
        throw error;
    }

    // 3. RabbitMQ
    try {
        logger.info("Connecting to RabbitMQ...");
        await rabbitmq.connect();
        logger.info("RabbitMQ connected successfully");
    } catch (error) {
        logger.error("Failed to connect to RabbitMQ:", error);
        throw error;
    }

    logger.info("All connections established successfully");
}

/**
 * Start the Express server after establishing database connections.
 * Also sets up graceful shutdown handlers for SIGINT and SIGTERM signals.
 * On shutdown, it closes the HTTP server and all database connections before exiting the process.
 * If any error occurs during startup or shutdown, it logs the error and exits with a non-zero status code.
 */
async function startServer() {
    try {
        await initializeConnection();

        const server = app.listen(config.port, () => {
            logger.info(`HTTP server successfully listening on port ${config.port}`);
            logger.info(`Environment: ${config.node_env}`);
            logger.info(`API available at: http://localhost:${config.port}`);

            // Start in-process event consumer when standalone worker is not deployed (e.g. Free plan)
            if (process.env.ENABLE_IN_PROCESS_CONSUMER !== 'false') {
                logger.info('Starting in-process RabbitMQ event consumer...');
                startConsumerWithRetry().catch((err) => {
                    logger.error('Failed to start in-process event consumer:', err);
                });
            }
        });


        const gracefulShutdown = async (signal) => {
            logger.info(`${signal} received, shutting down gracefully...`);

            server.close(async () => {
                logger.info("HTTP server closed");

                try {
                    if (consumer && consumer.isRunning) {
                        await consumer.stop();
                        logger.info('Event consumer stopped');
                    }
                    await mongodb.disconnect();
                    await postgres.close();
                    await rabbitmq.close();
                    logger.info('All connections closed, exiting process');
                    process.exit(0);
                } catch (error) {
                    logger.error('Error during shutdown:', error);
                    process.exit(1);
                }
            })

            setTimeout(() => {
                logger.error("Forced shutdown")
                process.exit(1);
            }, 10000);

        }

        process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
        process.on("SIGINT", () => gracefulShutdown("SIGINT"));

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught Exception:', error);
            gracefulShutdown('uncaughtException');
        });

        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
            gracefulShutdown('unhandledRejection');
        });

    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer()