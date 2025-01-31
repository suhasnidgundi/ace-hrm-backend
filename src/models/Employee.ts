import mongoose, { Document, Schema, Types } from "mongoose";

export interface IEmployee extends Document {
    _id: Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    employeeNumber: string;
    jobTitle: string;
    department: string;
    role: "Manager" | "Employee";
    teamId?: Types.ObjectId;
    reportsTo?: mongoose.Types.ObjectId;
    dateOfJoining: Date;
    employmentStatus: "Active" | "OnLeave" | "Terminated";
    workLocation: string;
    contractType: "FullTime" | "PartTime" | "Contract";
    leaveBalance: {
        annual: number;
        sick: number;
        casual: number;
    };
    compensation: {
        salary: number;
        currency: string;
        effectiveDate: Date;
    };
    documents?: Array<{
        type: string;
        url: string;
        uploadedAt: Date;
    }>;
    customFields?: Array<{
        key: string;
        value: string;
    }>;
    availableAnnualLeaveDays?: number;
    // Add these timestamp fields
    createdAt: Date;
    updatedAt: Date;
}

const EmployeeSchema = new Schema<IEmployee>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "UserProfile",
            required: true,
            unique: true,
        },
        teamId: {
            type: Schema.Types.ObjectId,
            ref: 'Team'
        },
        employeeNumber: {
            type: String,
            required: true,
            unique: true,
        },
        jobTitle: {
            type: String,
            required: true,
        },
        department: {
            type: String,
            required: true,
        },
        role: {
            type: String,
            enum: ["Manager", "Employee"],
            default: "Employee",
        },
        reportsTo: {
            type: Schema.Types.ObjectId,
            ref: "Employee",
        },
        dateOfJoining: {
            type: Date,
            required: true,
        },
        employmentStatus: {
            type: String,
            enum: ["Active", "OnLeave", "Terminated"],
            default: "Active",
        },
        workLocation: String,
        contractType: {
            type: String,
            enum: ["FullTime", "PartTime", "Contract"],
            required: true,
        },
        leaveBalance: {
            annual: {
                type: Number,
                default: 30,
            },
            sick: {
                type: Number,
                default: 10,
            },
            casual: {
                type: Number,
                default: 5,
            },
        },
        compensation: {
            salary: Number,
            currency: {
                type: String,
                default: "USD",
            },
            effectiveDate: Date,
        },
        documents: [{
            type: String,
            url: String,
            uploadedAt: {
                type: Date,
                default: Date.now,
            },
        }],
        customFields: [{
            key: String,
            value: String,
        }],
    },
    {
        timestamps: true,
    }
);

// Index for faster queries
EmployeeSchema.index({ employeeNumber: 1 });
EmployeeSchema.index({ role: 1 });
EmployeeSchema.index({ department: 1 });
EmployeeSchema.index({ reportsTo: 1 });

export const Employee = mongoose.model<IEmployee>("Employee", EmployeeSchema);