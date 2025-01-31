import { Request, Response, NextFunction } from "express";
import { Types } from 'mongoose';
import jwt from "jsonwebtoken";
import { Auth, IAuth } from '../models/Auth';
import { UserProfile } from '../models/UserProfile';
import { Employee } from '../models/Employee';

// Update interface to match your token structure
interface JwtPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}

// Add type declaration for req.user
declare global {
  namespace Express {
    interface Request {
      user?: {
        profile: any;
        employee: any;
      };
    }
  }
}

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.employee?.role;

    if (!userRole || !roles.includes(userRole)) {
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
    }

    next();
  };
};

export const auth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Get and validate token
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new Error("No token provided");
    }

    // Decode token
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
    
    // Log for debugging
    console.log('Decoded token:', decoded);

    // Find auth record using sub (which contains the Auth document ID)
    const auth = await Auth.findById(decoded.sub);
    if (!auth || !auth.isActive) {
      throw new Error("Authentication failed");
    }

    // Use auth.userId to find profile and employee
    const [profile, employee] = await Promise.all([
      UserProfile.findById(auth.userId),
      Employee.findOne({ userId: auth.userId })
    ]);

    // Log for debugging
    console.log('Found profile:', !!profile);
    console.log('Found employee:', !!employee);

    if (profile && employee) {
      req.user = {
        profile: profile,
        employee: employee
      };
    } else {
      console.log('Missing user data - Profile exists:', !!profile, 'Employee exists:', !!employee);
      throw new Error("User data not found");
    }

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: "Please authenticate" });
  }
};