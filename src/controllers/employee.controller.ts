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
    }
};