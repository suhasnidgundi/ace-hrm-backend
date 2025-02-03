import { Request } from 'express';
import { Document } from 'mongoose';
import { IUserProfile } from '../models/UserProfile';
import { IEmployee } from '../models/Employee';
import { IAuth } from '../models/Auth';

export interface AuthenticatedRequest extends Request {
    auth?: IAuth;
    user?: {
        profile: Document<unknown, any, IUserProfile> & IUserProfile;
        employee: Document<unknown, any, IEmployee> & IEmployee;
    };
}

export interface TimeOffQueryParams {
    s?: string; // JSON string of filters
    limit?: number;
    page?: number;
    offset?: number;
    sort?: string[];
}

export interface TimeOffFilter {
    $and?: Array<{
        [key: string]: {
            [operator: string]: any
        }
    }>;
}

export interface TimeOffSort {
    field: string;
    direction: 'ASC' | 'DESC';
}

export interface TimeOffRequest {

    timeOffType: string;

    startsAt: Date;

    endsAt: Date;

    reason: string;

}
