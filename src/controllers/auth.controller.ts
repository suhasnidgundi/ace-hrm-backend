import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Auth } from '../models/Auth';
import { UserProfile } from '../models/UserProfile';
import { Employee, IEmployee } from '../models/Employee';
import { Types } from 'mongoose';
interface LoginResponse {
  accessToken: string;
  user: {
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
    customFields: {
      key: string;
      value: string;
    }[];
    availableAnnualLeaveDays: number;
  };
  refreshToken: string;
}

export const authController = {
  login: async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      // Find auth record with password and populate related data
      const auth = await Auth.findOne({ email })
        .select('+password')
        .lean();

      if (!auth) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isValid = await Auth.prototype.comparePassword.call(auth, password);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Get user data in parallel with type assertion
      const [userProfile, employee] = await Promise.all([
        UserProfile.findById(auth.userId).lean(),
        Employee.findOne({ userId: auth.userId })
          .populate<{ reportsTo: { teamId?: number } }>('reportsTo', 'teamId')
          .lean()
      ]);

      if (!userProfile || !employee) {
        return res.status(404).json({ error: 'User profile or employee data not found' });
      }

      // Update last login
      await Auth.findByIdAndUpdate(auth._id, { lastLogin: new Date() });

      // Generate tokens
      const accessToken = jwt.sign(
        {
          sub: auth._id.toString(),
          email: auth.email
        },
        process.env.JWT_SECRET as string,
        { expiresIn: '3d' }
      );

      const refreshToken = jwt.sign(
        {
          sub: auth._id.toString(),
          email: auth.email
        },
        process.env.JWT_REFRESH_SECRET as string,
        { expiresIn: '7d' }
      );

      // Construct response with null checks
      const response: LoginResponse = {
        accessToken,
        user: {
          id: parseInt(auth._id.toString().slice(-8), 16),
          createdAt: auth.createdAt,
          updatedAt: auth.updatedAt,
          teamId: employee.reportsTo?.teamId,
          avatarUrl: userProfile.avatarUrl,
          firstName: userProfile.firstName,
          lastName: userProfile.lastName,
          jobTitle: employee.jobTitle,
          role: employee.role,
          email: auth.email,
          address: userProfile.address?.street
            ? `${userProfile.address.street}, ${userProfile.address.city}, ${userProfile.address.state}`
            : '',
          phone: userProfile.phone || '',
          birthdate: userProfile.birthDate,
          links: userProfile.links || [],
          customFields: userProfile.customFields || [],
          availableAnnualLeaveDays: employee.leaveBalance.annual
        },
        refreshToken
      };

      res.json(response);
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  },

  register: async (req: Request, res: Response) => {
    try {
      const {
        firstName,
        lastName,
        email,
        password,
        jobTitle,
        role = 'Employee',
        department,
        avatarUrl,
        phone,
        address,
        links = [],
        customFields = [],
        emergencyContact,
        workLocation,
        contractType = 'FullTime',
        compensation,
        teamId,
        birthDate
      } = req.body;

      // Validate required fields
      const requiredFields = ['firstName', 'lastName', 'email', 'password', 'jobTitle', 'department', 'birthDate', "avatarUrl"];
      const missingFields = requiredFields.filter(field => !req.body[field]);

      if (missingFields.length) {
        return res.status(400).json({
          error: 'Missing required fields',
          required: missingFields
        });
      }

      // Check if email exists
      const existingAuth = await Auth.findOne({ email }).lean();
      if (existingAuth) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      // Create user profile
      const userProfile = await UserProfile.create({
        firstName,
        lastName,
        email,
        phone,
        address,
        links,
        avatarUrl,
        birthDate,
        customFields,
        emergencyContact
      });

      // Create employee record
      const employeeNumber = `EMP${Date.now()}`;
      const employee = await Employee.create({
        userId: userProfile._id,
        employeeNumber,
        jobTitle,
        department,
        role,
        teamId: teamId && Types.ObjectId.isValid(teamId) ? new Types.ObjectId(teamId) : undefined,
        dateOfJoining: new Date(),
        workLocation,
        contractType,
        compensation: compensation || {
          salary: 0,
          currency: 'USD',
          effectiveDate: new Date()
        },
        leaveBalance: {
          annual: 30,
          sick: 10,
          casual: 5
        }
      });

      // Create auth record
      const auth = await Auth.create({
        email,
        password,
        userId: userProfile._id
      });

      // Format response
      const response = {
        message: 'User registered successfully',
        user: {
          id: parseInt(auth.id.toString().slice(-8), 16),
          createdAt: auth.createdAt,
          updatedAt: auth.updatedAt,
          teamId: employee.teamId,
          firstName: userProfile.firstName,
          lastName: userProfile.lastName,
          jobTitle: employee.jobTitle,
          birthdate: userProfile.birthDate,
          avatarUrl: userProfile.avatarUrl,
          role: employee.role,
          email: auth.email,
          address: address?.street ? `${address.street}, ${address.city}, ${address.state}` : '',
          phone: userProfile.phone || '',
          links: userProfile.links || [],
          customFields: userProfile.customFields || [],
          availableAnnualLeaveDays: employee.leaveBalance.annual
        }
      };

      res.status(201).json(response);

    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  },

  logout: async (req: Request, res: Response) => {
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');

      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      try {
        // Verify and decode the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { sub: string };

        // Update the auth record with logout time
        await Auth.findByIdAndUpdate(decoded.sub, {
          lastLogout: new Date(),
        });

        res.json({ message: 'Logged out successfully' });
      } catch (error) {
        // Token verification failed
        res.status(401).json({ error: 'Invalid token' });
      }
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  }

};