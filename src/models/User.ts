import mongoose, { Document, Schema } from "mongoose";

// Define interface for custom fields
interface CustomField {
  key: string;
  value: string;
}

// Define interface for User document
export interface IUser extends Document {
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  role: "Manager" | "Employee";
  teamId?: mongoose.Types.ObjectId;
  jobTitle?: string;
  address?: string;
  phone?: string;
  birthdate?: Date;
  links?: string[];
  customFields?: CustomField[];
  availableAnnualLeaveDays: number;
  password: string;
  createdAt: Date;
  updatedAt: Date;
  dateOfJoining?: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    firstName: String,
    lastName: String,
    avatarUrl: String,
    role: {
      type: String,
      enum: ["Manager", "Employee"],
      default: "Employee",
    },
    teamId: {
      type: Schema.Types.ObjectId,
      ref: "Team",
    },
    jobTitle: String,
    address: String,
    phone: String,
    birthdate: Date,
    links: [String],
    customFields: [
      {
        key: String,
        value: String,
      },
    ],
    availableAnnualLeaveDays: {
      type: Number,
      default: 30,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

// Create and export the model
export const User = mongoose.model<IUser>("User", UserSchema);

// Export the schema if needed elsewhere
export default UserSchema;
