import mongoose, { Model, Types } from 'mongoose';
import { TimeOff, ITimeOff } from '../models/TimeOff';
import { Employee } from '../models/Employee';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';
import { TimeOffQueryParams } from '../types/request.types';

interface QueryFilters {
    status?: 'Pending' | 'Approved' | 'Rejected';
    timeOffType?: 'Annual' | 'Sick' | 'Casual';
    employeeId?: Types.ObjectId | number;
    startsAt?: { $gte?: Date; $lt?: Date };
    endsAt?: { $gte?: Date; $lt?: Date };
}

type IdType = string | number | Types.ObjectId;
interface SortOptions {
    [key: string]: 'ASC' | 'DESC';
}

/**
 * Utility function to compare two IDs that could be strings or ObjectIds
 */
const compareIds = (id1: string | Types.ObjectId, id2: string | Types.ObjectId): boolean => {
    // Convert both IDs to strings for comparison
    const str1 = id1.toString();
    const str2 = id2.toString();
    return str1 === str2;
};

export class TimeOffService {

    private static parseQueryString(queryString: string): any {
        try {
            const decoded = decodeURIComponent(queryString);
            const parsed = JSON.parse(decoded);
            return this.transformOperators(parsed);
        } catch (error) {
            throw new AppError('Invalid filter parameter', 400);
        }
    }

    private static transformOperators(filter: Record<string, unknown>): QueryFilters {
        const transform = (obj: unknown): any => {
            if (Array.isArray(obj)) {
                return obj.map(item => transform(item));
            }

            if (obj !== null && typeof obj === 'object') {
                const newObj: Record<string, unknown> = {};
                for (const [key, value] of Object.entries(obj)) {
                    // Special handling for employeeId
                    if (key === 'employeeId' && (typeof value === 'string' || typeof value === 'number')) {
                        newObj[key] = handleId(value);
                        continue;
                    }

                    // Handle date fields
                    if ((key === 'startsAt' || key === 'endsAt') && typeof value === 'string') {
                        newObj[key] = new Date(value);
                        continue;
                    }

                    newObj[key] = transform(value);
                }
                return newObj;
            }

            return obj;
        };

        return transform(filter) as QueryFilters;
    }

    private static isDateString(value: string): boolean {
        return !isNaN(Date.parse(value));
    }

    private static buildMongoQuery(filters: any): any {
        return filters || {};
    }

    private static parseSort(sortParams: string[]): Record<string, 1 | -1> {
        if (!sortParams.length) {
            return { createdAt: -1 };
        }

        return sortParams.reduce((acc: Record<string, 1 | -1>, sortStr: string) => {
            const [field, direction] = sortStr.split(',');
            acc[field] = direction.toUpperCase() === 'ASC' ? 1 : -1;
            return acc;
        }, {});
    }

    private static parseSortString(sortString: string | undefined): SortOptions {
        if (!sortString || typeof sortString !== 'string') {
            // Default sort if no valid sort string is provided
            return { createdAt: 'DESC' };
        }

        try {
            const [field, direction] = sortString.split(',');
            if (!field || !direction) {
                return { createdAt: 'DESC' };
            }

            const validDirection = direction.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
            return { [field]: validDirection };
        } catch (error) {
            // Return default sort if parsing fails
            return { createdAt: 'DESC' };
        }
    }

    static async getTimeOffs(params: TimeOffQueryParams) {
        const {
            s: queryString,
            limit = 10,
            page,
            offset,
            sort
        } = params;

        try {
            // Parse filters
            const filters: QueryFilters = queryString ? this.parseQueryString(queryString) : {};

            // Handle employeeId/employeeNumber lookup
            if (filters.employeeId) {
                const employeeQuery = Types.ObjectId.isValid(filters.employeeId)
                    ? { _id: filters.employeeId }
                    : { employeeNumber: filters.employeeId.toString() };

                const employee = await Employee.findOne(employeeQuery);
                if (employee) {
                    filters.employeeId = employee._id;
                } else {
                    // If employee not found, return empty result
                    return {
                        data: [],
                        count: 0,
                        total: 0,
                        page: page || 1,
                        pageCount: 0
                    };
                }
            }

            const skip = offset !== undefined ? offset : (page ? (page - 1) * limit : 0);
            const sortOptions = this.parseSort(sort || []);

            const [data, total] = await Promise.all([
                TimeOff.find(filters)
                    .sort(sortOptions)
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                TimeOff.countDocuments(filters)
            ]);

            return {
                data: data.map(item => ({
                    ...item,
                    startsAt: item.startsAt.toISOString().split('T')[0],
                    endsAt: item.endsAt.toISOString().split('T')[0],
                    id: item._id
                })),
                count: data.length,
                total,
                page: page || 1,
                pageCount: Math.ceil(total / limit)
            };
        } catch (error) {
            logger.error('Error fetching time-off records:', error);
            throw new AppError(
                `Failed to fetch time-off records: ${error instanceof Error ? error.message : 'Unknown error'}`,
                500
            );
        }
    }

    // Create a new time off request
    static async createTimeOff(data: {
        employeeId: IdType;
        timeOffType: 'Annual' | 'Sick' | 'Casual';
        startsAt: Date;
        endsAt: Date;
        reason?: string;
    }): Promise<ITimeOff> {
        try {
            logger.info('Creating time-off request with data:', {
                ...data,
                employeeId: data.employeeId.toString()
            });

            // Validate dates
            const startsAt = new Date(data.startsAt);
            const endsAt = new Date(data.endsAt);

            if (isNaN(startsAt.getTime()) || isNaN(endsAt.getTime())) {
                throw new AppError('Invalid date format', 400);
            }

            if (startsAt > endsAt) {
                throw new AppError('Start date must be before end date', 400);
            }

            if (startsAt < new Date()) {
                throw new AppError('Cannot create time-off request for past dates', 400);
            }

            // Find employee by ID or employee number
            const employeeQuery = Types.ObjectId.isValid(data.employeeId.toString())
                ? { _id: data.employeeId }
                : { employeeNumber: data.employeeId.toString() };

            logger.info('Looking up employee with query:', employeeQuery);

            const employee = await Employee.findOne(employeeQuery);
            if (!employee) {
                throw new AppError(`Employee with ID ${data.employeeId} not found`, 404);
            }

            // Calculate duration
            const duration = Math.ceil(
                (endsAt.getTime() - startsAt.getTime()) / (1000 * 60 * 60 * 24)
            ) + 1;

            // Validate leave balance
            const leaveType = data.timeOffType.toLowerCase() as keyof typeof employee.leaveBalance;
            if (employee.leaveBalance[leaveType] < duration) {
                throw new AppError(
                    `Insufficient ${leaveType} leave balance. Available: ${employee.leaveBalance[leaveType]}, Required: ${duration}`,
                    400
                );
            }

            // Check for overlapping time-off requests
            const overlapping = await TimeOff.findOne({
                employeeId: employee._id,
                status: { $ne: 'Rejected' },
                $or: [
                    {
                        startsAt: { $lte: endsAt },
                        endsAt: { $gte: startsAt }
                    }
                ]
            });

            if (overlapping) {
                throw new AppError(
                    'Time-off request overlaps with an existing request',
                    400
                );
            }

            // Create the time-off request
            const timeOffData = {
                employeeId: employee._id,
                timeOffType: data.timeOffType,
                startsAt,
                endsAt,
                reason: data.reason,
                status: 'Pending'
            };

            logger.info('Creating time-off request with processed data:', {
                ...timeOffData,
                employeeId: timeOffData.employeeId.toString()
            });

            const timeOff = await TimeOff.create(timeOffData);

            logger.info('Time-off request created successfully:', {
                id: timeOff._id.toString(),
                employeeId: timeOff.employeeId.toString()
            });

            return timeOff;
        } catch (error) {
            // Log the detailed error
            logger.error('Error creating time-off request:', {
                error: error instanceof Error ? {
                    message: error.message,
                    stack: error.stack,
                    name: error.name
                } : 'Unknown error',
                data: {
                    ...data,
                    employeeId: data.employeeId.toString()
                }
            });

            // Throw appropriate error
            if (error instanceof AppError) {
                throw error;
            }

            if (error instanceof mongoose.Error.ValidationError) {
                throw new AppError(
                    'Invalid time-off request data: ' + Object.values(error.errors).map(err => err.message).join(', '),
                    400
                );
            }

            throw new AppError(
                `Failed to create time-off request: ${error instanceof Error ? error.message : 'Unknown error'}`,
                500
            );
        }
    }

    // Cancel a time off request
    static async cancelTimeOff(
        timeOffId: IdType,
        employeeId: IdType
    ): Promise<ITimeOff> {
        try {
            const timeOff = await TimeOff.findById(timeOffId);
            if (!timeOff) {
                throw new AppError('Time off request not found', 404);
            }

            // Find the employee
            const employeeQuery = Types.ObjectId.isValid(employeeId.toString())
                ? { _id: employeeId }
                : { employeeNumber: employeeId.toString() };
            const employee = await Employee.findOne(employeeQuery);
            if (!employee) {
                throw new AppError('Employee not found', 404);
            }

            // Verify ownership using the compare function
            if (!compareIds(timeOff.employeeId, employee._id)) {
                throw new AppError('Not authorized to cancel this time off request', 403);
            }

            if (timeOff.status !== 'Pending') {
                throw new AppError(`Cannot cancel ${timeOff.status.toLowerCase()} time off request`, 400);
            }

            timeOff.status = 'Rejected';
            await timeOff.save();

            logger.info(`Time off request ${timeOffId} cancelled by employee ${employee.employeeNumber}`);

            return timeOff;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            logger.error('Error cancelling time off request:', error);
            throw new AppError('Failed to cancel time-off request', 500);
        }
    }

    static async reviewTimeOff(
        timeOffId: IdType,
        reviewerId: IdType,
        data: {
            status: 'Approved' | 'Rejected';
            reviewNote?: string;
        }
    ): Promise<ITimeOff> {
        try {
            const timeOff = await TimeOff.findById(timeOffId);
            if (!timeOff) {
                throw new AppError('Time off request not found', 404);
            }

            // Find the reviewer (manager)
            const reviewerQuery = Types.ObjectId.isValid(reviewerId.toString())
                ? { _id: reviewerId }
                : { employeeNumber: reviewerId.toString() };
            const reviewer = await Employee.findOne(reviewerQuery);
            if (!reviewer) {
                throw new AppError('Reviewer not found', 404);
            }

            // Find the employee
            const employee = await Employee.findById(timeOff.employeeId);
            if (!employee) {
                throw new AppError('Employee not found', 404);
            }

            // Check if reviewer is trying to review their own request
            if (compareIds(employee._id, reviewer._id)) {
                throw new AppError('Cannot review your own time off request', 403);
            }

            // If approving, check and update leave balance
            if (data.status === 'Approved') {
                const duration = Math.ceil(
                    (timeOff.endsAt.getTime() - timeOff.startsAt.getTime()) /
                    (1000 * 60 * 60 * 24)
                ) + 1;

                const leaveType = timeOff.timeOffType.toLowerCase() as keyof typeof employee.leaveBalance;

                if (employee.leaveBalance[leaveType] < duration) {
                    throw new AppError(
                        `Insufficient ${leaveType} leave balance. Available: ${employee.leaveBalance[leaveType]}, Required: ${duration}`,
                        400
                    );
                }

                employee.leaveBalance[leaveType] -= duration;
                await employee.save();
            }

            Object.assign(timeOff, {
                status: data.status,
                reviewedBy: reviewer._id,
                reviewedAt: new Date(),
                reviewNote: data.reviewNote
            });

            await timeOff.save();

            logger.info(`Time off request ${timeOffId} ${data.status.toLowerCase()} by ${reviewer.employeeNumber}`);

            return timeOff;
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            logger.error('Error reviewing time off request:', error);
            throw new AppError('Failed to review time-off request', 500);
        }
    }


    // Get time off statistics
    static async getTimeOffStats(employeeId?: Types.ObjectId) {
        const query = employeeId ? { employeeId } : {};

        const stats = await TimeOff.aggregate([
            { $match: query },
            {
                $group: {
                    _id: {
                        status: '$status',
                        type: '$timeOffType'
                    },
                    count: { $sum: 1 },
                    totalDays: {
                        $sum: {
                            $add: [
                                {
                                    $divide: [
                                        { $subtract: ['$endsAt', '$startsAt'] },
                                        1000 * 60 * 60 * 24
                                    ]
                                },
                                1
                            ]
                        }
                    }
                }
            },
            {
                $group: {
                    _id: '$_id.status',
                    types: {
                        $push: {
                            type: '$_id.type',
                            count: '$count',
                            days: '$totalDays'
                        }
                    },
                    totalCount: { $sum: '$count' },
                    totalDays: { $sum: '$totalDays' }
                }
            }
        ]);

        return stats;
    }
}

// Utility function to safely convert various ID formats to ObjectId
const toObjectId = (id: string | number | Types.ObjectId): Types.ObjectId => {
    if (id instanceof Types.ObjectId) {
        return id;
    }

    // If it's a number, convert it to a hex string padded to 24 characters
    if (typeof id === 'number') {
        const hexString = id.toString(16).padStart(24, '0');
        return new Types.ObjectId(hexString);
    }

    // If it's a string that could be a number
    if (typeof id === 'string' && /^\d+$/.test(id)) {
        const hexString = parseInt(id).toString(16).padStart(24, '0');
        return new Types.ObjectId(hexString);
    }

    // If it's a valid ObjectId string
    if (Types.ObjectId.isValid(id)) {
        return new Types.ObjectId(id);
    }

    throw new AppError('Invalid ID format', 400);
};

// Utility function to safely handle both numeric IDs and ObjectIds
const handleId = (id: IdType): Types.ObjectId | number => {
    // If it's already an ObjectId, return it
    if (id instanceof Types.ObjectId) {
        return id;
    }

    // If it's a valid ObjectId string, convert it
    if (typeof id === 'string' && Types.ObjectId.isValid(id)) {
        return new Types.ObjectId(id);
    }

    // If it's a number, return it as is
    if (typeof id === 'number') {
        return id;
    }

    // If it's a numeric string, convert to number
    if (typeof id === 'string' && /^\d+$/.test(id)) {
        return parseInt(id, 10);
    }

    throw new AppError('Invalid ID format', 400);
};