import { Request, Response } from 'express';
import { Employee } from '../models/Employee';
import { UserProfile } from '../models/UserProfile';
import mongoose from 'mongoose';
import { AppError } from '../utils/errors';

interface EmployeeQuery {
    department?: string;
    role?: string;
    employmentStatus?: string;
    reportsTo?: mongoose.Types.ObjectId;
    userId?: { $in: mongoose.Types.ObjectId[] };
}

interface EmployeeResponse {
    id: number;
    createdAt: Date;
    updatedAt: Date;
    teamId?: number;
    avatarUrl?: string;
    firstName: string;
    lastName: string;
    jobTitle: string;
    role: string;
    email: string;
    address: string;
    phone: string;
    birthdate?: Date;
    links: string[];
    customFields: Array<{ key: string; value: string }>;
    availableAnnualLeaveDays: number;
}

interface CreateEmployeeDTO {
    firstName: string;
    lastName: string;
    email: string;
    jobTitle: string;
    department: string;
    role: "Manager" | "Employee";
    dateOfJoining: Date;
    employmentStatus: "Active" | "OnLeave" | "Terminated";
    workLocation: string;
    contractType: "FullTime" | "PartTime" | "Contract";
    salary?: number;
    reportsTo?: string;
    teamId?: string;
}

interface UpdateLeaveBalanceDTO {
    leaveType: 'annual' | 'sick' | 'casual';
    amount: number;
    operation: 'add' | 'subtract';
}

export const employeeController = {
    // Get all employees with filtering and pagination
    getEmployees: async (req: Request, res: Response) => {
        try {
            const {
                role,
                limit = '10',
                page = '1',
                s
            } = req.query;

            const query: EmployeeQuery = {};
            
            // Parse search query if exists
            if (s) {
                try {
                    const searchQuery = JSON.parse(decodeURIComponent(s as string));
                    if (searchQuery.$and) {
                        const roleFilter = searchQuery.$and.find((f: any) => f.role);
                        if (roleFilter) {
                            query.role = roleFilter.role.$eq;
                        }
                    }
                } catch (e) {
                    console.error('Search query parse error:', e);
                }
            } else if (role) {
                query.role = role as string;
            }

            const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

            // Execute query with population
            const [employees, total] = await Promise.all([
                Employee.find(query)
                    .populate('userId', '-__v')
                    .skip(skip)
                    .limit(parseInt(limit as string))
                    .sort({ createdAt: -1 }),
                Employee.countDocuments(query)
            ]);

            // Transform data to match desired response format
            const formattedEmployees: EmployeeResponse[] = employees.map(emp => ({
                id: parseInt(emp._id.toString().slice(-8), 16),
                createdAt: emp.createdAt,
                updatedAt: emp.updatedAt,
                teamId: emp.teamId ? parseInt(emp.teamId.toString().slice(-8), 16) : undefined,
                avatarUrl: (emp.userId as any).avatarUrl,
                firstName: (emp.userId as any).firstName,
                lastName: (emp.userId as any).lastName,
                jobTitle: emp.jobTitle,
                role: emp.role,
                email: (emp.userId as any).email,
                address: (emp.userId as any).address?.street 
                    ? `${(emp.userId as any).address.street}, ${(emp.userId as any).address.city}, ${(emp.userId as any).address.state}`
                    : '',
                phone: (emp.userId as any).phone || '',
                birthdate: (emp.userId as any).birthDate,
                links: (emp.userId as any).links || [],
                customFields: (emp.userId as any).customFields || [],
                availableAnnualLeaveDays: emp.leaveBalance.annual
            }));

            res.json({
                data: formattedEmployees,
                total,
                page: parseInt(page as string),
                totalPages: Math.ceil(total / parseInt(limit as string))
            });
        } catch (error) {
            console.error('Get employees error:', error);
            res.status(500).json({ error: 'Failed to fetch employees' });
        }
    },

    // Get current user profile
    getMe: async (req: Request, res: Response) => {
        try {
            const userId = req.user?.profile._id;
            console.log('User ID from token:', userId);
            
            const [employee, userProfile] = await Promise.all([
                Employee.findOne({ userId }).populate('teamId'),
                UserProfile.findById(userId)
            ]);
    
            console.log('Found employee:', employee);
            console.log('Found userProfile:', userProfile);
    
            if (!employee || !userProfile) {
                console.log('Missing records - Employee exists:', !!employee, 'UserProfile exists:', !!userProfile);
                return res.status(404).json({ error: 'Profile not found' });
            }
    
            const response: EmployeeResponse = {
                id: parseInt(employee._id.toString().slice(-8), 16),
                createdAt: employee.createdAt,
                updatedAt: employee.updatedAt,
                teamId: employee.teamId ? parseInt(employee.teamId.toString().slice(-8), 16) : undefined,
                avatarUrl: userProfile.avatarUrl,
                firstName: userProfile.firstName,
                lastName: userProfile.lastName,
                jobTitle: employee.jobTitle,
                role: employee.role,
                email: userProfile.email,
                address: userProfile.address?.street 
                    ? `${userProfile.address.street}, ${userProfile.address.city}, ${userProfile.address.state}`
                    : '',
                phone: userProfile.phone || '',
                birthdate: userProfile.birthDate,
                links: userProfile.links || [],
                customFields: userProfile.customFields || [],
                availableAnnualLeaveDays: employee.leaveBalance.annual
            };
    
            res.json(response);
        } catch (error) {
            console.error('Get profile error:', error);
            res.status(500).json({ error: 'Failed to fetch profile' });
        }
    },

    createEmployee: async (req: Request, res: Response) => {
        try {
            const employeeData: CreateEmployeeDTO = req.body;

            // Generate employee number
            const lastEmployee = await Employee.findOne().sort({ employeeNumber: -1 });
            const nextNumber = lastEmployee 
                ? parseInt(lastEmployee.employeeNumber.slice(3)) + 1 
                : 1;
            const employeeNumber = `EMP${nextNumber.toString().padStart(4, '0')}`;

            // Create user profile first
            const userProfile = new UserProfile({
                firstName: employeeData.firstName,
                lastName: employeeData.lastName,
                email: employeeData.email
            });
            await userProfile.save();

            // Create employee record
            const employee = new Employee({
                userId: userProfile._id,
                employeeNumber,
                jobTitle: employeeData.jobTitle,
                department: employeeData.department,
                role: employeeData.role,
                dateOfJoining: employeeData.dateOfJoining,
                employmentStatus: employeeData.employmentStatus,
                workLocation: employeeData.workLocation,
                contractType: employeeData.contractType,
                teamId: employeeData.teamId ? new mongoose.Types.ObjectId(employeeData.teamId) : undefined,
                reportsTo: employeeData.reportsTo ? new mongoose.Types.ObjectId(employeeData.reportsTo) : undefined,
                compensation: employeeData.salary ? {
                    salary: employeeData.salary,
                    currency: 'USD',
                    effectiveDate: new Date()
                } : undefined
            });

            await employee.save();

            res.status(201).json(employee);
        } catch (error) {
            console.error('Create employee error:', error);
            res.status(500).json({ error: 'Failed to create employee' });
        }
    },

    updateEmployee: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const updateData = req.body;

            // Find employee and associated user profile
            const employee = await Employee.findById(id);
            if (!employee) {
                throw new AppError('Employee not found', 404);
            }

            // Update employee fields
            Object.assign(employee, updateData);
            await employee.save();

            // Update user profile if relevant fields are provided
            if (updateData.firstName || updateData.lastName || updateData.email) {
                const userProfile = await UserProfile.findById(employee.userId);
                if (userProfile) {
                    if (updateData.firstName) userProfile.firstName = updateData.firstName;
                    if (updateData.lastName) userProfile.lastName = updateData.lastName;
                    if (updateData.email) userProfile.email = updateData.email;
                    await userProfile.save();
                }
            }

            res.json(employee);
        } catch (error) {
            console.error('Update employee error:', error);
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
            } else {
                res.status(500).json({ error: 'Failed to update employee' });
            }
        }
    },

    updateLeaveBalance: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { leaveType, amount, operation }: UpdateLeaveBalanceDTO = req.body;

            // Validate requester is a manager
            if (req.user?.employee.role !== 'Manager') {
                throw new AppError('Only managers can update leave balance', 403);
            }

            const employee = await Employee.findById(id);
            if (!employee) {
                throw new AppError('Employee not found', 404);
            }

            // Update leave balance
            const currentBalance = employee.leaveBalance[leaveType];
            employee.leaveBalance[leaveType] = operation === 'add' 
                ? currentBalance + amount 
                : currentBalance - amount;

            // Ensure balance doesn't go negative
            if (employee.leaveBalance[leaveType] < 0) {
                throw new AppError('Leave balance cannot be negative', 400);
            }

            await employee.save();
            res.json(employee);
        } catch (error) {
            console.error('Update leave balance error:', error);
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
            } else {
                res.status(500).json({ error: 'Failed to update leave balance' });
            }
        }
    },

    deleteEmployee: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            // Find employee
            const employee = await Employee.findById(id);
            if (!employee) {
                throw new AppError('Employee not found', 404);
            }

            // Check if requester is a manager
            if (req.user?.employee.role !== 'Manager') {
                throw new AppError('Only managers can delete employees', 403);
            }

            // Delete employee and associated user profile
            await Promise.all([
                Employee.findByIdAndDelete(id),
                UserProfile.findByIdAndDelete(employee.userId)
            ]);

            res.status(204).send();
        } catch (error) {
            console.error('Delete employee error:', error);
            if (error instanceof AppError) {
                res.status(error.statusCode).json({ error: error.message });
            } else {
                res.status(500).json({ error: 'Failed to delete employee' });
            }
        }
    }
};