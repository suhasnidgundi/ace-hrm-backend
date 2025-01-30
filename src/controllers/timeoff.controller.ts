import { Request, Response } from 'express';
import { TimeOff, ITimeOff } from '../models/TimeOff';
import { Types } from 'mongoose';

export const timeOffController = {
    createTimeOff: async (req: Request, res: Response) => {
        try {
            const { timeOffType, startsAt, endsAt, reason } = req.body;

            // Safely access employee._id with type checking
            const employeeId = req.user?.employee._id;
            if (!employeeId) {
                return res.status(400).json({ error: 'Employee ID not found' });
            }

            const timeOff = await TimeOff.create({
                employeeId: employeeId,
                timeOffType,
                startsAt: new Date(startsAt),
                endsAt: new Date(endsAt),
                reason,
                status: 'Pending'
            });

            return res.status(201).json(timeOff);
        } catch (error) {
            console.error('Error creating time off:', error);
            return res.status(500).json({ error: 'Failed to create time off request' });
        }
    },

    reviewTimeOff: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { status, reviewNote } = req.body;
            const reviewerId = req.user?.employee._id;

            if (!reviewerId) {
                return res.status(400).json({ error: 'Reviewer ID not found' });
            }

            if (!Types.ObjectId.isValid(id)) {
                return res.status(400).json({ error: 'Invalid ID format' });
            }

            const timeOff = await TimeOff.findById(new Types.ObjectId(id));
            if (!timeOff) {
                return res.status(404).json({ error: 'Time off request not found' });
            }

            timeOff.status = status;
            timeOff.reviewedBy = reviewerId;
            timeOff.reviewedAt = new Date();
            timeOff.reviewNote = reviewNote;

            await timeOff.save();
            return res.json(timeOff);
        } catch (error) {
            console.error('Error reviewing time off:', error);
            return res.status(500).json({ error: 'Failed to review time off request' });
        }
    },

    getTimeOffs: async (req: Request, res: Response) => {

        try {

            const timeOffs = await TimeOff.find();
            res.json(timeOffs);

        } catch (error) {
            res.status(500).json({ message: 'Error fetching time offs' });
        }

    },

    getTimeOffStats: async (req: Request, res: Response) => {

        try {

            const stats = await TimeOff.aggregate([
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }
                }
            ]);

            res.json(stats);

        } catch (error) {
            res.status(500).json({ message: 'Error fetching time off stats' });
        }

    }
};