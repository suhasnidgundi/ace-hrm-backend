import mongoose, { Document, Schema, Types } from 'mongoose';
import { IUser } from './User';

// Define interface for TimeOff document
export interface ITimeOff extends Document {
  _id: Types.ObjectId;
  employeeId: Types.ObjectId | string; // Allow both ObjectId and string
  employeeNumber?: string; // Add this field
  timeOffType: 'Annual' | 'Sick' | 'Casual';
  status: 'Pending' | 'Approved' | 'Rejected';
  startsAt: Date;
  endsAt: Date;
  reason?: string;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  reviewNote?: string;
}

// Create the TimeOff schema
const TimeOffSchema = new Schema<ITimeOff>(
  {
    employeeId: {
      type: Schema.Types.Mixed, // Changed to Mixed to support both ObjectId and string
      required: [true, 'Employee ID is required'],
      index: true
    },
    timeOffType: {
      type: String,
      enum: {
        values: ['Annual', 'Sick', 'Casual'],
        message: '{VALUE} is not a valid time off type'
      },
      required: [true, 'Time off type is required']
    },
    status: {
      type: String,
      enum: {
        values: ['Pending', 'Approved', 'Rejected'],
        message: '{VALUE} is not a valid status'
      },
      default: 'Pending',
      index: true
    },
    startsAt: {
      type: Date,
      required: [true, 'Start date is required'],
      index: true
    },
    endsAt: {
      type: Date,
      required: [true, 'End date is required'],
      index: true,
      validate: {
        validator: function (this: ITimeOff, endDate: Date) {
          return endDate >= this.startsAt;
        },
        message: 'End date must be after or equal to start date'
      }
    },
    reason: {
      type: String,
      maxlength: [500, 'Reason cannot be more than 500 characters']
    },
    reviewedBy: {
      type: Number,
      ref: 'Employee' // Changed from 'User' to 'Employee'
    },
    reviewedAt: {
      type: Date
    },
    reviewNote: {
      type: String,
      maxlength: [500, 'Review note cannot be more than 500 characters']
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Add indexes for common queries
TimeOffSchema.index({ employeeId: 1, status: 1 });
TimeOffSchema.index({ timeOffType: 1, status: 1 });
TimeOffSchema.index({ startsAt: 1, endsAt: 1 });

// Virtual for calculating duration in days
TimeOffSchema.virtual('durationDays').get(function (this: ITimeOff) {
  return Math.ceil((this.endsAt.getTime() - this.startsAt.getTime()) / (1000 * 60 * 60 * 24)) + 1;
});

// Pre-save middleware to validate dates
TimeOffSchema.pre('save', function (next) {
  if (this.isModified('status') && this.status === 'Approved') {
    if (!this.reviewedBy || !this.reviewedAt) {
      next(new Error('Approved time off must have reviewer and review date'));
      return;
    }
  }
  next();
});

// Static method to check for overlapping time off requests
TimeOffSchema.statics.checkOverlapping = async function (
  employeeId: mongoose.Types.ObjectId,
  startsAt: Date,
  endsAt: Date,
  excludeId?: mongoose.Types.ObjectId
) {
  const query = {
    employeeId,
    status: { $ne: 'Rejected' },
    $or: [
      { startsAt: { $lte: endsAt }, endsAt: { $gte: startsAt } }
    ]
  };

  if (excludeId) {
    Object.assign(query, { _id: { $ne: excludeId } });
  }

  return await this.countDocuments(query) > 0;
};

// Create and export the model
export const TimeOff = mongoose.model<ITimeOff>('TimeOff', TimeOffSchema);

// Export the schema if needed elsewhere
export default TimeOffSchema;