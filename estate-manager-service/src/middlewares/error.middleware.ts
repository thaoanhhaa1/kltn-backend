import { Request, Response, NextFunction } from 'express';
import CustomError, { EntryError } from '../utils/error.util';

const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
    const statusCode = err.statusCode || err.response?.status || 500;
    const message = err.message || 'Internal Server Error';

    if (err instanceof EntryError)
        return res.status(statusCode).json({
            success: false,
            message: err.message,
            details: err.details,
            statusCode,
        });

    if (err instanceof CustomError)
        return res.status(statusCode).json({
            success: false,
            message: err.message,
            statusCode,
        });

    res.status(statusCode).json({
        success: false,
        message,
        statusCode,
    });
};

export default errorHandler;
