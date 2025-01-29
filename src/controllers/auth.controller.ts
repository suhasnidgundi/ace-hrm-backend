import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User, IUser } from '../models/User';
import jwt from 'jsonwebtoken';

// Type for user data without password
type UserResponse = Omit<IUser, 'password'>;

export const login = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const accessToken = jwt.sign(
      { sub: user._id, email: user.email },
      process.env.JWT_SECRET as string,
      { expiresIn: '3d' }
    );

    const refreshToken = jwt.sign(
      { sub: user._id, email: user.email },
      process.env.JWT_REFRESH_SECRET as string,
      { expiresIn: '7d' }
    );

    // Pick only the fields we want to send
    const userResponse = {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      avatarUrl: user.avatarUrl,
      jobTitle: user.jobTitle,
      availableAnnualLeaveDays: user.availableAnnualLeaveDays
    };

    res.json({
      accessToken,
      refreshToken,
      user: userResponse
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      role = "Employee",
      jobTitle,
      phone,
      address
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const user = new User({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role,
      jobTitle,
      phone,
      address,
      availableAnnualLeaveDays: 30
    });

    await user.save();

    // Create a response object without password
    const userResponse = {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      jobTitle: user.jobTitle,
      phone: user.phone,
      address: user.address,
      availableAnnualLeaveDays: user.availableAnnualLeaveDays,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    res.status(201).json({
      message: 'User registered successfully',
      user: userResponse
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
};