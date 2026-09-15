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
import cookieParser from "cookie-parser";

const app=express();

// Middlewares
app.use(helmet());
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(errorHandler);

app.use((req,res,next)=>{
    logger.info(`${req.method} ${req.path}`,{
        ip:req.ip,
        userAgent:req.headers['user-agent']
    })
    next()
});

// Health Check endpoint
app.get('/health',(req,res)=>{
    res.status(200).json(
        ResponseFormatter.success(
            {
                status:'healthy',
                timestamp: new Date().toISOString(),
                uptime:process.uptime(),
            },
            'Service is healthy'
        )
    )
});

app.use('/',(req,res)=>{
    res.status(200).json(
        ResponseFormatter.success(
            {
                service:'PulseAPI',
                version:'1.0.0',
                endpoints:{
                    health:'/health',
                    auth:'/api/auth',
                    ingest:'/api/hit',
                    analytics:'/api/analytics',
                }
            },
            'PulseAPI'
        )
    )
});

// If user request on an endpoint that doesn't exist : 404 handler
app.use((req,res)=>{
    res.status(404).json(ResponseFormatter.error("endpoint not found",404))
});

async function initializeConnection() {
    try{
        logger.info("Initiaizing database connections...");
        await mongodb.connect();
        await postgres.testConnection();
        await rabbitmq.connect();
        logger.info("All connection established successfully");
    }
    catch(error){
        logger.error("Failed to initialize connections:",error);
        throw error;
    }
}

async function startServer() {
    try{
        await initializeConnection();
        const server=app.listen(config.port,()=>{
            logger.info(`Server started on port :${config.port}`);
            logger.info(`Environment : ${config.node_env}`);
            logger.info(`API available at:http://localhost:${config.port}`);
        });

        const gracefulShutdown=async (signal)=>{
            logger.info(`${signal} recieved ,shutting down gracefully...`);
            server.close(async()=>{
                logger.info("HTTP server closed");

                try{
                    await mongodb.disconnect();
                    await postgres.close();
                    await rabbitmq.close();
                    logger.info('All connections closed,existing process');
                    process.exit(0);
                }
                catch(error){
                    logger.error('Error during shutdown:',error);
                    process.exit(1);
                }
            })

            setTimeout(()=>{
                logger.error("Forced shutdown");
                process.exit(1);
            },10000)
        }

        process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
        process.on("SIGINT", () => gracefulShutdown("SIGINT"));

        // Handle uncaught exceptions
        process.on('uncaughtException',(error)=>{
            logger.error('Uncaught Exception:',error);
            gracefulShutdown('uncaughtException');
        })
        process.on('unhandledRejection',(reason,promise)=>{
            logger.error('Uncaught Rejection at :',promise,' reason:',reason);
            gracefulShutdown('unhandledRejection');
        })  

    }
    catch(error){
        logger.error("Failed to initialize connections:",error);
        process.exit(1);
    }
}

startServer();