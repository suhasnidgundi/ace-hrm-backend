import { Request, Response } from 'express';
import { TimeOff } from '../models/TimeOff';
import { User } from '../models/User';
import mongoose, { SortOrder } from 'mongoose';

interface TimeOffQuery {
    status?: string;
    timeOffType?: string;
    employeeId?: string;
    endsAt?: { $lt?: Date };
}

interface FilterParams {
    s?: string;
    limit?: string;
    page?: string;
    offset?: string;
    sort?: string[];
    join?: string[];
}

export const timeOffController = {
    // Get time offs with filtering
    getTimeOffs: async (req: Request, res: Response) => {
        try {
            const { s, limit = '10', page = '1', sort = [], join = [] } = req.query as FilterParams;

            // Parse the search parameter if it exists
            let query: TimeOffQuery = {};
            if (s) {
                const searchParams = JSON.parse(decodeURIComponent(s));
                if (searchParams.$and) {
                    searchParams.$and.forEach((condition: any) => {
                        if (condition.status) query.status = condition.status.$eq;
                        if (condition.timeOffType) query.timeOffType = condition.timeOffType.$eq;
                        if (condition.employeeId) query.employeeId = condition.employeeId.$eq;
                        if (condition.endsAt) query.endsAt = { $lt: new Date(condition.endsAt.$lt) };
                    });
                }
            }

            // Build the query
            let timeOffQuery = TimeOff.find(query);

            // Handle joins
            if (join.includes('employee')) {
                timeOffQuery = timeOffQuery.populate('employeeId', 'firstName lastName email avatarUrl');
            }

            // Handle sorting
            if (sort.length > 0) {
                const [field, order] = sort[0].split(',');
                const sortQuery: [string, SortOrder][] = [[field, order === 'DESC' ? 'desc' : 'asc']];
                timeOffQuery = timeOffQuery.sort(sortQuery);
            }

            // Handle pagination
            const skip = (parseInt(page) - 1) * parseInt(limit);
            timeOffQuery = timeOffQuery.skip(skip).limit(parseInt(limit));

            const [timeOffs, total] = await Promise.all([
                timeOffQuery.exec(),
                TimeOff.countDocuments(query)
            ]);

            res.json({
                data: timeOffs,
                total,
                page: parseInt(page),
                pageSize: parseInt(limit)
            });
        } catch (error) {
            console.error('Error fetching time offs:', error);
            res.status(500).json({ error: 'Failed to fetch time offs' });
        }
    },

    // Create new time off request
    createTimeOff: async (req: Request, res: Response) => {
        try {
            const { timeOffType, startsAt, endsAt, reason } = req.body;
            const employeeId = req.user?._id;

            // Validate dates
            if (new Date(startsAt) > new Date(endsAt)) {
                return res.status(400).json({ error: 'Start date must be before end date' });
            }

            // Calculate number of days
            const days = Math.ceil((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / (1000 * 60 * 60 * 24)) + 1;

            // Check available days for annual leave
            if (timeOffType === 'Annual') {
                const user = await User.findById(employeeId);
                if (!user || user.availableAnnualLeaveDays < days) {
                    return res.status(400).json({ error: 'Insufficient annual leave days' });
                }
            }

            const timeOff = new TimeOff({
                employeeId,
                timeOffType,
                startsAt,
                endsAt,
                reason,
                status: 'Pending'
            });

            await timeOff.save();

            res.status(201).json(timeOff);
        } catch (error) {
            console.error('Error creating time off:', error);
            res.status(500).json({ error: 'Failed to create time off request' });
        }
    },

    // Review time off request (for managers)
    reviewTimeOff: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { status, reviewNote } = req.body;
            const reviewerId = req.user?._id as mongoose.Types.ObjectId;

            if (!['Approved', 'Rejected'].includes(status)) {
                return res.status(400).json({ error: 'Invalid status' });
            }

            const timeOff = await TimeOff.findById(id);
            if (!timeOff) {
                return res.status(404).json({ error: 'Time off request not found' });
            }

            // Update leave days if approved and it's an annual leave
            if (status === 'Approved' && timeOff.timeOffType === 'Annual') {
                const days = Math.ceil((timeOff.endsAt.getTime() - timeOff.startsAt.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                await User.findByIdAndUpdate(
                    timeOff.employeeId,
                    { $inc: { availableAnnualLeaveDays: -days } }
                );
            }

            timeOff.status = status;
            timeOff.reviewedBy = reviewerId;
            timeOff.reviewedAt = new Date();
            timeOff.reviewNote = reviewNote;

            await timeOff.save();

            res.json(timeOff);
        } catch (error) {
            console.error('Error reviewing time off:', error);
            res.status(500).json({ error: 'Failed to review time off request' });
        }
    },

    // Get time off usage statistics
    getTimeOffStats: async (req: Request, res: Response) => {
        try {
            const employeeId = req.query.employeeId || req.user?._id;

            const [sickLeave, casualLeave, annualLeave] = await Promise.all([
                TimeOff.countDocuments({
                    employeeId,
                    timeOffType: 'Sick',
                    status: 'Approved'
                }),
                TimeOff.countDocuments({
                    employeeId,
                    timeOffType: 'Casual',
                    status: 'Approved'
                }),
                TimeOff.countDocuments({
                    employeeId,
                    timeOffType: 'Annual',
                    status: 'Approved'
                })
            ]);

            const user = await User.findById(employeeId);

            res.json({
                sickLeave,
                casualLeave,
                annualLeave,
                availableAnnualLeaveDays: user?.availableAnnualLeaveDays || 0
            });
        } catch (error) {
            console.error('Error fetching time off stats:', error);
            res.status(500).json({ error: 'Failed to fetch time off statistics' });
        }
    }
};