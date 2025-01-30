import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    console.error(err);

    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            error: err.message,
            code: err.code,
            details: err.details
        });
    }

    // MongoDB Validation Error
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Validation Error',
            code: 'VALIDATION_ERROR',
            details: err
        });
    }

    // MongoDB Duplicate Key Error
    if (err.name === 'MongoError' && (err as any).code === 11000) {
        return res.status(400).json({
            error: 'Duplicate Entry',
            code: 'DUPLICATE_ERROR',
            details: err
        });
    }

    // Default error response
    return res.status(500).json({
        error: 'Internal Server Error',
        code: 'INTERNAL_SERVER_ERROR'
    });
};