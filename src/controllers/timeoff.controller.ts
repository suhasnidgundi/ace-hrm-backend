import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { TimeOffService } from '../services/timeoff.service';
import { AuthenticatedRequest } from '../types/request.types';
import { AppError } from '../utils/errors';
import { timeOffQuerySchema } from '../utils/validators';

export const timeOffController = {
    async getTimeOffs(req: Request, res: Response, next: NextFunction) {
        try {
            const { error, value } = timeOffQuerySchema.validate(req.query, {
                abortEarly: false,
                convert: true,
                allowUnknown: true  // Allow other query params
            });
    
            if (error) {
                const errorMessage = error.details.map(d => d.message).join('; ');
                throw new AppError(errorMessage, 400);
            }
    
            const result = await TimeOffService.getTimeOffs({
                s: value.s,
                limit: value.limit,
                page: value.page,
                offset: value.offset,
                sort: Array.isArray(value.sort) ? value.sort : 
                    value.sort ? [value.sort] : undefined
            });
    
            res.json(result);
        } catch (error) {
            next(error);
        }
    },

    async createTimeOff(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            // Extract employeeId from the authenticated user
            const employeeId = req.user?.employee._id;
            if (!employeeId) {
                throw new AppError('Employee ID not found in token', 401);
            }

            // Create the time-off request
            const timeOff = await TimeOffService.createTimeOff({
                ...req.body,
                employeeId // Add employeeId from the token
            });

            res.status(201).json(timeOff);
        } catch (error) {
            next(error);
        }
    },

    async reviewTimeOff(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { status, reviewNote } = req.body;
            
            if (!req.user?.employee._id) {
                throw new AppError('Unauthorized', 401);
            }

            const timeOff = await TimeOffService.reviewTimeOff(
                new Types.ObjectId(id),
                req.user.employee._id,
                {
                    status,
                    reviewNote
                }
            );

            res.json(timeOff);
        } catch (error) {
            next(error);
        }
    },

    async getTimeOffStats(req: Request, res: Response, next: NextFunction) {
        try {
            const { employeeId } = req.query;
            const stats = await TimeOffService.getTimeOffStats(
                employeeId ? new Types.ObjectId(employeeId as string) : undefined
            );
            res.json(stats);
        } catch (error) {
            next(error);
        }
    }
};