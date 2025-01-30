import { Request, Response, NextFunction } from "express";
import { Types } from 'mongoose';
import jwt from "jsonwebtoken";
import { Auth, IAuth } from '../models/Auth';
import { UserProfile } from '../models/UserProfile';
import { Employee } from '../models/Employee';

interface JwtPayload {
  sub: string;
  userId: string;
}

export const requireRole = (roles: string[]) => {

  return (req: Request, res: Response, next: NextFunction) => {

      const userRole = (req.user as any)?.role;

      if (!userRole || !roles.includes(userRole)) {

          return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });

      }

      next();

  };

};

export const auth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new Error("No token provided");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;

    const auth = await Auth.findById(decoded.sub);
    if (!auth || !auth.isActive) {
      throw new Error("Authentication failed");
    }

    const [profile, employee] = await Promise.all([
      UserProfile.findById(decoded.userId),
      Employee.findOne({ userId: decoded.userId })
    ]);

    if (profile && employee) {
      req.user = {
        profile: profile,
        employee: employee
      };
    }

    next();
  } catch (error) {
    res.status(401).json({ error: "Please authenticate" });
  }
};