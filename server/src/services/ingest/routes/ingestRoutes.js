import express from "express";
import ingestContainer from '../Dependencies/dependencies.js';
const { ingestController } = ingestContainer;
import validateApiKey from '../../../shared/middlewares/validateApiKey.js';
import rateLimit from 'express-rate-limit';
import config from '../../../shared/config/index.js';
import ResponseFormatter from '../../../shared/utils/responseFormatter.js';

const router = express.Router();

// Rate limiter for the ingest endpoint to prevent abuse and ensure fair usage.
const ingestLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json(
            ResponseFormatter.error('Too many requests, please try again later', 429)
        );
    }
});

router.post("/", validateApiKey, ingestLimiter, (req, res, next) => ingestController.ingestHit(req, res, next))

export default router;