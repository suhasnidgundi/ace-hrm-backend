import { IUserProfile } from '../models/UserProfile';
import { IEmployee } from '../models/Employee';
import { Document, Types } from 'mongoose';

declare global {
  namespace Express {
    interface Request {
      user?: {
        profile: Document<unknown, any, IUserProfile> & IUserProfile;
        employee: Document<unknown, any, IEmployee> & IEmployee & { _id: Types.ObjectId };
      };
    }
  }
}