import mongoose, { Document, Schema, Types } from 'mongoose';

// Define interfaces for team hierarchy
export interface ITeamMember {
  employeeId: Types.ObjectId;
  role: string;
  joinedAt: Date;
}

export interface ITeam extends Document {
  name: string;
  description?: string;
  organizationHead?: Types.ObjectId;
  parentTeam?: Types.ObjectId;
  subTeams: Types.ObjectId[];
  members: ITeamMember[];
  department: string;
  level: number; // Hierarchy level (0 for org head, 1 for direct reports, etc.)
  status: 'Active' | 'Inactive';
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  metadata?: Record<string, any>;
}

const TeamSchema = new Schema<ITeam>(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    organizationHead: {
      type: Schema.Types.ObjectId,
      ref: 'Employee'
    },
    parentTeam: {
      type: Schema.Types.ObjectId,
      ref: 'Team'
    },
    subTeams: [{
      type: Schema.Types.ObjectId,
      ref: 'Team'
    }],
    members: [{
      employeeId: {
        type: Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
      },
      role: {
        type: String,
        required: true,
        enum: ['Leader', 'Manager', 'Member']
      },
      joinedAt: {
        type: Date,
        default: Date.now
      }
    }],
    department: {
      type: String,
      required: true
    },
    level: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active'
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true
    },
    metadata: {
      type: Map,
      of: Schema.Types.Mixed
    }
  },
  {
    timestamps: true
  }
);

// Indexes for better query performance
TeamSchema.index({ parentTeam: 1 });
TeamSchema.index({ department: 1 });
TeamSchema.index({ level: 1 });
TeamSchema.index({ 'members.employeeId': 1 });

export const Team = mongoose.model<ITeam>('Team', TeamSchema);