import { Request, Response } from 'express';
import { Employee } from '../models/Employee';
import { UserProfile } from '../models/UserProfile';
import mongoose from 'mongoose';

interface EmployeeQuery {
    department?: string;
    role?: string;
    employmentStatus?: string;
    reportsTo?: mongoose.Types.ObjectId;
    userId?: { $in: mongoose.Types.ObjectId[] };
}

export const employeeController = {
    // Get all employees with filtering and pagination
    getEmployees: async (req: Request, res: Response) => {
        try {
            const {
                department,
                role,
                status,
                page = '1',
                limit = '10',
                search
            } = req.query;

            const query: EmployeeQuery = {};

            // Apply filters
            if (department) query.department = department as string;
            if (role) query.role = role as string;
            if (status) query.employmentStatus = status as string;

            // Handle search
            if (search) {
                const userProfiles = await UserProfile.find({
                    $or: [
                        { firstName: new RegExp(search as string, 'i') },
                        { lastName: new RegExp(search as string, 'i') },
                        { email: new RegExp(search as string, 'i') }
                    ]
                });
                const userIds = userProfiles.map(profile => profile._id as mongoose.Types.ObjectId);
                query['userId'] = { $in: userIds };
            }

            const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

            // Execute query with population
            const [employees, total] = await Promise.all([
                Employee.find(query)
                    .populate('userId', 'firstName lastName email avatarUrl')
                    .populate('reportsTo', 'userId')
                    .skip(skip)
                    .limit(parseInt(limit as string))
                    .sort({ createdAt: -1 }),
                Employee.countDocuments(query)
            ]);

            res.json({
                data: employees,
                total,
                page: parseInt(page as string),
                totalPages: Math.ceil(total / parseInt(limit as string))
            });
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch employees' });
        }
    },

    // Get employee details
    getEmployee: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            const employee = await Employee.findById(id)
                .populate('userId', '-__v')
                .populate('reportsTo', 'userId');

            if (!employee) {
                return res.status(404).json({ error: 'Employee not found' });
            }

            res.json(employee);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch employee details' });
        }
    },

    // Update employee
    updateEmployee: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const updateData = req.body;

            // Ensure the requester has permission (either the employee themselves or a manager)
            if (req.user?.employee.role !== 'Manager' &&
                req.user?.employee._id.toString() !== id) {
                return res.status(403).json({ error: 'Not authorized' });
            }

            const employee = await Employee.findByIdAndUpdate(
                id,
                { $set: updateData },
                { new: true, runValidators: true }
            ).populate('userId');

            if (!employee) {
                return res.status(404).json({ error: 'Employee not found' });
            }

            res.json(employee);
        } catch (error) {
            res.status(500).json({ error: 'Failed to update employee' });
        }
    },

    // Get employee hierarchy (for managers)
    getTeamHierarchy: async (req: Request, res: Response) => {
        try {
            const managerId = req.user?.employee._id;

            const teamMembers = await Employee.find({ reportsTo: managerId })
                .populate('userId', 'firstName lastName email avatarUrl')
                .sort({ createdAt: -1 });

            res.json(teamMembers);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch team hierarchy' });
        }
    },

    // Update employee leave balance
    updateLeaveBalance: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { leaveType, amount, operation } = req.body;

            // Ensure requester is a manager
            if (req.user?.employee.role !== 'Manager') {
                return res.status(403).json({ error: 'Not authorized' });
            }

            const employee = await Employee.findById(id);
            if (!employee) {
                return res.status(404).json({ error: 'Employee not found' });
            }

            const updateQuery = operation === 'add'
                ? { $inc: { [`leaveBalance.${leaveType}`]: amount } }
                : { $inc: { [`leaveBalance.${leaveType}`]: -amount } };

            const updatedEmployee = await Employee.findByIdAndUpdate(
                id,
                updateQuery,
                { new: true, runValidators: true }
            );

            res.json(updatedEmployee);
        } catch (error) {
            res.status(500).json({ error: 'Failed to update leave balance' });
        }
    }
};