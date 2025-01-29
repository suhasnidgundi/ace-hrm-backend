import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

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

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatarUrl: user.avatarUrl,
        jobTitle: user.jobTitle,
        availableAnnualLeaveDays: user.availableAnnualLeaveDays
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
};