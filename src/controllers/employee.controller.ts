import { Request, Response } from 'express';
import { Employee, IEmployee } from '../models/Employee';
import { IUserProfile, UserProfile } from '../models/UserProfile';
import mongoose, { Types } from 'mongoose';
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

// Type for MongoDB validation error
interface MongoError extends Error {
    code?: number;
    keyPattern?: Record<string, number>;
}

// Type for validation error
interface ValidationError extends Error {
    errors: Record<string, { message: string }>;
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

            // Validate required fields
            const requiredFields = [
                'firstName', 'lastName', 'email', 'jobTitle', 
                'department', 'role', 'dateOfJoining', 
                'employmentStatus', 'workLocation', 'contractType'
            ];

            for (const field of requiredFields) {
                if (!employeeData[field as keyof CreateEmployeeDTO]) {
                    throw new AppError(`${field} is required`, 400);
                }
            }

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
            const savedUserProfile = await userProfile.save();

            // Prepare employee data with proper ObjectId handling
            const employeeDoc: Partial<IEmployee> = {
                userId: savedUserProfile._id as Types.ObjectId,
                employeeNumber,
                jobTitle: employeeData.jobTitle,
                department: employeeData.department,
                role: employeeData.role,
                dateOfJoining: new Date(employeeData.dateOfJoining),
                employmentStatus: employeeData.employmentStatus,
                workLocation: employeeData.workLocation,
                contractType: employeeData.contractType,
            };

            // Handle optional fields with proper ObjectId validation
            if (employeeData.teamId) {
                if (mongoose.Types.ObjectId.isValid(employeeData.teamId)) {
                    employeeDoc.teamId = new Types.ObjectId(employeeData.teamId);
                } else {
                    throw new AppError('Invalid teamId format', 400);
                }
            }

            if (employeeData.reportsTo) {
                if (mongoose.Types.ObjectId.isValid(employeeData.reportsTo)) {
                    employeeDoc.reportsTo = new Types.ObjectId(employeeData.reportsTo);
                } else {
                    throw new AppError('Invalid reportsTo format', 400);
                }
            }

            // Handle salary if provided
            if (employeeData.salary) {
                employeeDoc.compensation = {
                    salary: employeeData.salary,
                    currency: 'USD',
                    effectiveDate: new Date()
                };
            }

            // Set default leave balance
            employeeDoc.leaveBalance = {
                annual: 30,
                sick: 10,
                casual: 5
            };

            // Create employee with validated data
            const employee = new Employee(employeeDoc);
            const savedEmployee = await employee.save();

            // Fetch the complete employee data with populated fields
            const populatedEmployee = await Employee.findById(savedEmployee._id)
                .populate<{ userId: IUserProfile }>('userId', '-__v')
                .populate('teamId', 'name')
                .populate<{ reportsTo: IEmployee & { userId: IUserProfile } }>('reportsTo', 'userId');

            if (!populatedEmployee) {
                throw new AppError('Failed to fetch created employee details', 500);
            }

            // Format the response
            const response = {
                id: parseInt(savedEmployee._id.toString().slice(-8), 16),
                employeeNumber: savedEmployee.employeeNumber,
                firstName: savedUserProfile.firstName,
                lastName: savedUserProfile.lastName,
                email: savedUserProfile.email,
                jobTitle: savedEmployee.jobTitle,
                department: savedEmployee.department,
                role: savedEmployee.role,
                dateOfJoining: savedEmployee.dateOfJoining,
                employmentStatus: savedEmployee.employmentStatus,
                workLocation: savedEmployee.workLocation,
                contractType: savedEmployee.contractType,
                team: populatedEmployee.teamId ? {
                    id: (populatedEmployee.teamId as any)._id,
                    name: (populatedEmployee.teamId as any).name
                } : undefined,
                reportsTo: populatedEmployee.reportsTo ? {
                    id: populatedEmployee.reportsTo._id,
                    name: `${populatedEmployee.reportsTo.userId.firstName} ${populatedEmployee.reportsTo.userId.lastName}`
                } : undefined,
                compensation: savedEmployee.compensation,
                leaveBalance: savedEmployee.leaveBalance
            };

            res.status(201).json(response);
        } catch (error: unknown) {
            console.error('Create employee error:', error);
            
            // Handle specific errors with proper type checking
            if (error instanceof AppError) {
                return res.status(error.statusCode).json({ error: error.message });
            }
            
            // Handle MongoDB duplicate key error
            if (error && typeof error === 'object' && 'code' in error) {
                const mongoError = error as MongoError;
                if (mongoError.code === 11000 && mongoError.keyPattern) {
                    return res.status(400).json({ 
                        error: 'Email already exists',
                        field: Object.keys(mongoError.keyPattern)[0]
                    });
                }
            }

            // Handle validation errors
            if (error && typeof error === 'object' && 'name' in error && error.name === 'ValidationError') {
                const validationError = error as ValidationError;
                return res.status(400).json({ 
                    error: 'Validation Error',
                    details: Object.values(validationError.errors).map(err => err.message)
                });
            }

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